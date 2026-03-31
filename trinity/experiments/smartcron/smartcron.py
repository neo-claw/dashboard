#!/usr/bin/env python3
"""
SmartCron - Enhanced cron with context, health checks, and reliability features.

Features:
- Cron-like scheduling with minutes resolution
- Inject recent memory snippets into job context
- Pre-run health checks (HTTP or command)
- Network availability check
- Concurrency locks (single-instance)
- Simple retry logic
- JSON log of outcomes
"""

import os
import sys
import json
import time
import subprocess
import threading
import sqlite3
import re
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any
import requests

# Configuration
WORKSPACE = Path.home() / ".openclaw" / "workspace"
SMARTCRON_DB = WORKSPACE / "trinity" / "experiments" / "smartcron" / "smartcron.db"
SMARTCRON_CONFIG = WORKSPACE / "trinity" / "experiments" / "smartcron" / "jobs.json"
MEMORY_DIR = WORKSPACE / "memory"
LOG_DB = WORKSPACE / "trinity" / "experiments" / "smartcron" / "runs.db"

def parse_cron_field(value: str) -> List[int]:
    """Parse a cron field (minute, hour, dom, month, dow) into list of allowed integers."""
    if value == "*":
        return None  # matches all
    if value.startswith("*/"):
        step = int(value[2:])
        return step  # special: step
    if "," in value:
        parts = [int(p) for p in value.split(",")]
        return parts
    if "-" in value:
        start, end = map(int, value.split("-"))
        return list(range(start, end+1))
    # Single number
    try:
        return [int(value)]
    except ValueError:
        return None

def matches_field(val: int, allowed, max_val: int) -> bool:
    if allowed is None:
        return True
    if isinstance(allowed, int):  # step
        return val % allowed == 0
    return val in allowed

def next_cron_run(schedule: str, after: datetime) -> datetime:
    """Compute the next datetime after 'after' that matches the cron schedule."""
    minute_expr, hour_expr, dom_expr, month_expr, dow_expr = schedule.split()
    minute_set = parse_cron_field(minute_expr)
    hour_set = parse_cron_field(hour_expr)
    dom_set = parse_cron_field(dom_expr)
    month_set = parse_cron_field(month_expr)
    dow_set = parse_cron_field(dow_expr)

    # Start checking from after + 1 minute to avoid immediate hit
    candidate = after.replace(second=0, microsecond=0) + timedelta(minutes=1)
    # Safety bound
    limit = after + timedelta(days=365)
    while candidate < limit:
        if month_set is not None and candidate.month not in month_set and not (isinstance(month_set, int) and candidate.month % month_set == 0):
            # fast-forward to next month if current month invalid
            if month_set and isinstance(month_set, list):
                next_month = min(m for m in month_set if m > candidate.month) if any(m > candidate.month for m in month_set) else month_set[0]
                if next_month <= candidate.month:
                    candidate = candidate.replace(year=candidate.year+1, month=next_month, day=1, hour=0, minute=0)
                    continue
            candidate += timedelta(days=1)
            continue

        if not matches_field(candidate.day, dom_set, 31):
            candidate += timedelta(days=1)
            candidate = candidate.replace(hour=0, minute=0)
            continue

        dow = candidate.weekday()  # Monday=0, Sunday=6
        if dow_set is not None:
            if isinstance(dow_set, int):
                if dow % dow_set != 0:
                    candidate += timedelta(days=1)
                    candidate = candidate.replace(hour=0, minute=0)
                    continue
            else:
                if dow not in dow_set:
                    candidate += timedelta(days=1)
                    candidate = candidate.replace(hour=0, minute=0)
                    continue

        if not matches_field(candidate.hour, hour_set, 23):
            candidate += timedelta(hours=1)
            candidate = candidate.replace(minute=0)
            continue

        if not matches_field(candidate.minute, minute_set, 59):
            candidate += timedelta(minutes=1)
            continue

        # All matched
        return candidate

    raise RuntimeError("No next cron match within a year")

class SmartCron:
    def __init__(self):
        self.db = sqlite3.connect(str(SMARTCRON_DB), check_same_thread=False)
        self.log_db = sqlite3.connect(str(LOG_DB), check_same_thread=False)
        self._init_db()
        self.locks = {}
        self.running = True

    def _init_db(self):
        cur = self.db.cursor()
        cur.execute("""
        CREATE TABLE IF NOT EXISTS jobs (
            id TEXT PRIMARY KEY,
            schedule TEXT NOT NULL,
            command TEXT,
            agent_message TEXT,
            context_memory_lines INTEGER DEFAULT 5,
            health_check_url TEXT,
            health_check_cmd TEXT,
            requires_network BOOLEAN DEFAULT 0,
            concurrency_lock TEXT,
            retry_attempts INTEGER DEFAULT 0,
            retry_delay_min INTEGER DEFAULT 5,
            enabled BOOLEAN DEFAULT 1,
            last_run TIMESTAMP,
            next_run TIMESTAMP NOT NULL
        )
        """)
        self.db.commit()

        cur = self.log_db.cursor()
        cur.execute("""
        CREATE TABLE IF NOT EXISTS run_log (
            job_id TEXT,
            scheduled_time TIMESTAMP,
            start_time TIMESTAMP,
            end_time TIMESTAMP,
            success BOOLEAN,
            output TEXT,
            error TEXT,
            attempts INTEGER
        )
        """)
        self.log_db.commit()

    def load_config(self):
        if not SMARTCRON_CONFIG.exists():
            print(f"Config not found: {SMARTCRON_CONFIG}")
            return []
        with open(SMARTCRON_CONFIG) as f:
            config = json.load(f)
        jobs = []
        now = datetime.now()
        for job in config.get("jobs", []):
            # Compute next_run based on stored next_run if exists, else from now
            stored = self._get_stored_next_run(job["id"])
            base = stored if stored else now
            next_run = next_cron_run(job["schedule"], base)
            jobs.append({
                "id": job["id"],
                "schedule": job["schedule"],
                "command": job.get("command"),
                "agent_message": job.get("agent_message"),
                "context_memory_lines": job.get("context_memory_lines", 5),
                "health_check_url": job.get("health_check_url"),
                "health_check_cmd": job.get("health_check_cmd"),
                "requires_network": job.get("requires_network", False),
                "concurrency_lock": job.get("concurrency_lock"),
                "retry_attempts": job.get("retry_attempts", 0),
                "retry_delay_min": job.get("retry_delay_min", 5),
                "enabled": job.get("enabled", True),
                "next_run": next_run
            })
        return jobs

    def _get_stored_next_run(self, job_id: str) -> Optional[datetime]:
        cur = self.db.cursor()
        cur.execute("SELECT next_run FROM jobs WHERE id=?", (job_id,))
        row = cur.fetchone()
        if row and row[0]:
            try:
                return datetime.fromisoformat(row[0])
            except Exception:
                return None
        return None

    def save_job_state(self, jobs):
        cur = self.db.cursor()
        for job in jobs:
            cur.execute("""
            INSERT OR REPLACE INTO jobs
            (id, schedule, command, agent_message, context_memory_lines,
             health_check_url, health_check_cmd, requires_network,
             concurrency_lock, retry_attempts, retry_delay_min, enabled, next_run)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                job["id"], job["schedule"], job["command"], job["agent_message"],
                job["context_memory_lines"], job["health_check_url"], job["health_check_cmd"],
                job["requires_network"], job["concurrency_lock"], job["retry_attempts"],
                job["retry_delay_min"], job["enabled"], job["next_run"].isoformat()
            ))
        self.db.commit()

    def get_recent_memory(self, lines: int = 5) -> str:
        """Read the most recent memory file and return last N lines as context."""
        try:
            # Find today's and yesterday's memory files
            today = datetime.now().strftime("%Y-%m-%d")
            yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
            files = [MEMORY_DIR / f"{today}.md", MEMORY_DIR / f"{yesterday}.md"]
            content = []
            for f in files:
                if f.exists():
                    with open(f) as fp:
                        content.extend(fp.readlines())
            if not content:
                return ""
            # Take last N lines
            return "".join(content[-lines:]).strip()
        except Exception as e:
            return f"# error reading memory: {e}"

    def check_health(self, url: Optional[str] = None, cmd: Optional[str] = None) -> bool:
        if url:
            try:
                resp = requests.get(url, timeout=5)
                return resp.status_code < 500
            except Exception:
                return False
        if cmd:
            try:
                result = subprocess.run(cmd, shell=True, capture_output=True, timeout=10)
                return result.returncode == 0
            except Exception:
                return False
        return True  # no check specified

    def is_network_up(self) -> bool:
        try:
            subprocess.run(["ping", "-c", "1", "-W", "2", "8.8.8.8"], capture_output=True, timeout=5)
            return True
        except Exception:
            return False

    def acquire_lock(self, lock_name: str) -> bool:
        lock_file = Path(f"/tmp/smartcron_lock_{lock_name}.lock")
        if lock_file.exists():
            # Check if stale (>1 hour)
            if time.time() - lock_file.stat().st_mtime > 3600:
                lock_file.unlink()
            else:
                return False
        lock_file.write_text(str(os.getpid()))
        return True

    def release_lock(self, lock_name: str):
        lock_file = Path(f"/tmp/smartcron_lock_{lock_name}.lock")
        if lock_file.exists():
            lock_file.unlink()

    def run_command(self, cmd: str, context: str) -> tuple[bool, str, str]:
        """Run a shell command with injected context via environment."""
        env = os.environ.copy()
        env["SMARTCRON_CONTEXT"] = context
        env["SMARTCRON_RUN_TIME"] = datetime.now().isoformat()
        try:
            proc = subprocess.run(cmd, shell=True, capture_output=True, text=True, env=env, timeout=300)
            return proc.returncode == 0, proc.stdout, proc.stderr
        except subprocess.TimeoutExpired:
            return False, "", "Timeout after 300s"
        except Exception as e:
            return False, "", str(e)

    def submit_agent_turn(self, message: str, context: str) -> tuple[bool, str, str]:
        """Submit a message to the main session via system event."""
        full_msg = f"{context}\n\n---\n\nJob Context: SmartCron job triggered.\n\n{message}"
        # In production, this would use sessions_send or cron delivery
        print(f"[AGENT TURN] Would send to main session: {full_msg[:200]}...")
        # For prototype, simulate success
        return True, "Agent message queued", ""

    def log_run(self, job_id: str, scheduled: datetime, start: datetime, end: datetime,
                success: bool, output: str, error: str, attempts: int):
        cur = self.log_db.cursor()
        cur.execute("""
        INSERT INTO run_log (job_id, scheduled_time, start_time, end_time, success, output, error, attempts)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (job_id, scheduled.isoformat(), start.isoformat(), end.isoformat(),
              success, output, error, attempts))
        self.log_db.commit()

    def process_job(self, job: Dict[str, Any]) -> bool:
        job_id = job["id"]
        scheduled = job["next_run"]
        print(f"[SmartCron] Running job {job_id}")

        # Build context
        context = self.get_recent_memory(job["context_memory_lines"])

        # Acquire concurrency lock if specified
        lock_name = job["concurrency_lock"]
        if lock_name:
            if not self.acquire_lock(lock_name):
                print(f"[SmartCron] Job {job_id} skipped: lock {lock_name} held")
                return False
        try:
            # Health checks
            if job["health_check_url"] or job["health_check_cmd"]:
                if not self.check_health(job["health_check_url"], job["health_check_cmd"]):
                    print(f"[SmartCron] Job {job_id} failed health check")
                    return False

            # Network requirement
            if job["requires_network"] and not self.is_network_up():
                print(f"[SmartCron] Job {job_id} skipped: network down")
                return False

            # Run job
            start = datetime.now()
            success = False
            output = ""
            error = ""

            attempts = 0
            max_attempts = job["retry_attempts"] + 1
            delay = job["retry_delay_min"]

            while attempts < max_attempts and not success:
                attempts += 1
                if job["command"]:
                    success, output, error = self.run_command(job["command"], context)
                elif job["agent_message"]:
                    success, output, error = self.submit_agent_turn(job["agent_message"], context)
                else:
                    success = False
                    error = "No command or agent_message defined"
                if not success and attempts < max_attempts:
                    time.sleep(delay * 60)

            end = datetime.now()
            self.log_run(job_id, scheduled, start, end, success, output, error, attempts)
            return success
        finally:
            if lock_name:
                self.release_lock(lock_name)

    def tick(self):
        jobs = self.load_config()
        now = datetime.now()
        for job in jobs:
            if not job["enabled"]:
                continue
            if job["next_run"] <= now:
                success = self.process_job(job)
                # Compute next run after the scheduled time to avoid drift
                job["next_run"] = next_cron_run(job["schedule"], job["next_run"])
        self.save_job_state(jobs)

    def run_loop(self, interval: int = 30):
        print("[SmartCron] Starting daemon loop (interval: 30s)")
        while self.running:
            try:
                self.tick()
            except Exception as e:
                print(f"[SmartCron] Error: {e}")
            time.sleep(interval)

    def stop(self):
        self.running = False

def create_sample_config():
    sample = {
        "jobs": [
            {
                "id": "daily_summary",
                "schedule": "0 6 * * *",  # 6:00 daily
                "agent_message": "Generate overnight digest: summarize memory, calendar, and pending tasks.",
                "context_memory_lines": 20,
                "concurrency_lock": "daily_summary"
            },
            {
                "id": "health_ping",
                "schedule": "*/30 * * * *",  # every 30 minutes
                "health_check_url": "http://localhost:8080/health",
                "agent_message": "System health check: what needs attention?",
                "requires_network": False
            },
            {
                "id": "backup_notes",
                "schedule": "0 2 * * *",  # 2:00 daily
                "command": "cp -r ~/.openclaw/workspace/memory /backup/memory_$(date +%Y%m%d)",
                "requires_network": False,
                "concurrency_lock": "backup"
            }
        ]
    }
    with open(str(SMARTCRON_CONFIG), "w") as f:
        json.dump(sample, f, indent=2)
    print(f"Created sample config: {SMARTCRON_CONFIG}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--init", action="store_true", help="Create sample config")
    parser.add_argument("--daemon", action="store_true", help="Run daemon loop")
    parser.add_argument("--tick", action="store_true", help="Run one tick")
    args = parser.parse_args()

    cron = SmartCron()
    if args.init:
        create_sample_config()
    elif args.daemon:
        cron.run_loop()
    elif args.tick:
        cron.tick()
    else:
        parser.print_help()
