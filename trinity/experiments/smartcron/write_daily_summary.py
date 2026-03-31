#!/usr/bin/env python3
"""
Daily summary generator for Trinity overnight digest.
Reads today's trinity/YYYY-MM-DD.md and the index to produce a concise summary for TRINITY.md.
"""

import os
import sys
import json
from datetime import datetime
from pathlib import Path

WORKSPACE = Path.home() / ".openclaw" / "workspace"
TRINITY_DIR = WORKSPACE / "trinity"
INDEX_FILE = TRINITY_DIR / "index.md"
TRINITY_FILE = WORKSPACE / "TRINITY.md"

def get_today_log():
    today = datetime.now().strftime("%Y-%m-%d")
    log_file = TRINITY_DIR / f"{today}.md"
    if not log_file.exists():
        return None, None
    with open(log_file) as f:
        content = f.read()
    return today, content

def extract_highlights(log_content: str) -> str:
    """Extract bullet points of built tools and utility scores from log."""
    highlights = []
    for line in log_content.splitlines():
        line = line.strip()
        if line.startswith("- **") or line.startswith("- "):
            highlights.append(line)
    return "\n".join(highlights) if highlights else "No specific highlights logged."

def main():
    today, log_content = get_today_log()
    if not today:
        print("No log for today found.")
        sys.exit(1)

    highlights = extract_highlights(log_content)

    # Compose summary section
    timestamp = datetime.now().strftime("%H:%M")
    summary = f"\n## {timestamp}\n\n"
    summary += "**Overnight Build Summary**:\n\n"
    summary += highlights + "\n\n"
    summary += "**Next Steps**: See trinity/index.md for full backlog.\n"

    # Append to TRINITY.md
    with open(TRINITY_FILE, "a") as f:
        f.write(summary)

    print(f"Daily summary appended to {TRINITY_FILE}")

    # Check for uncommitted changes and commit if needed
    try:
        # See if there are modifications or untracked files among the targets
        result = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=WORKSPACE,
            capture_output=True,
            text=True,
            timeout=10
        )
        lines = result.stdout.strip().splitlines() if result.stdout.strip() else []
        # Files of interest: TRINITY.md, trinity/index.md, any trinity/*.md, swe-brain/*
        relevant = any(
            line and (line[3:].startswith("TRINITY.md") or
                     line[3:].startswith("trinity/index.md") or
                     line[3:].startswith("trinity/") and line[3:].endswith(".md") or
                     line[3:].startswith("swe-brain/"))
            for line in lines
        )
        if relevant:
            # Stage exactly the files as per instruction
            subprocess.run(["git", "add", "TRINITY.md", "trinity/index.md", "trinity/*.md", "swe-brain/"],
                           cwd=WORKSPACE, timeout=30)
            commit_msg = f"Trinity {datetime.now().strftime('%Y-%m-%d %H:%M')}"
            subprocess.run(["git", "commit", "-m", commit_msg], cwd=WORKSPACE, timeout=30)
            subprocess.run(["git", "push", "origin", "master"], cwd=WORKSPACE, timeout=60)
            print("Committed and pushed daily summary changes.")
        else:
            print("No relevant changes to commit.")
    except Exception as e:
        print(f"Commit failed: {e}")

if __name__ == "__main__":
    main()
