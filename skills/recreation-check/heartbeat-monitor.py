#!/usr/bin/env python3
"""
Monitors the recreation-check heartbeat and sends an alert if the last successful
run was more than 15 minutes ago or if the last run failed.
"""
import sys
import json
import os
import time
import subprocess
from datetime import datetime, timedelta

HEARTBEAT_FILE = os.path.expanduser("~/.openclaw/workspace/cache/recreation-check-heartbeat.json")
LOG_FILE = os.path.expanduser("~/.openclaw/workspace/logs/recreation-check-heartbeat-monitor.log")

def log(msg):
    timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp} UTC] {msg}", file=sys.stderr)
    # Also append to log file
    try:
        with open(LOG_FILE, 'a') as f:
            f.write(f"[{timestamp} UTC] {msg}\n")
    except Exception:
        pass

def send_telegram_alert(message):
    """Send alert via Telegram if configured."""
    chat_id = os.environ.get('OPENCLAW_TELEGRAM_CHAT_ID') or '8755267864'
    bot_token = os.environ.get('OPENCLAW_TELEGRAM_BOT_TOKEN')
    if not bot_token:
        log("Telegram bot token not configured, cannot send alert")
        return False
    try:
        subprocess.run([
            'curl', '-s', '-X', 'POST',
            f'https://api.telegram.org/bot{bot_token}/sendMessage',
            '-d', f'chat_id={chat_id}',
            '-d', f'text={message}',
            '-d', 'parse_mode=plain'
        ], check=False, timeout=30)
        log("Telegram alert sent")
        return True
    except Exception as e:
        log(f"Telegram send failed: {e}")
        return False

def send_email_alert(subject, body):
    """Send alert via email if SMTP configured."""
    import smtplib
    from email.mime.text import MIMEText
    smtp_host = os.environ.get('OPENCLAW_SMTP_HOST')
    smtp_port = os.environ.get('OPENCLAW_SMTP_PORT', '587')
    smtp_user = os.environ.get('OPENCLAW_SMTP_USER')
    smtp_pass = os.environ.get('OPENCLAW_SMTP_PASS')
    from_addr = os.environ.get('OPENCLAW_EMAIL_FROM', smtp_user)
    to_addr = os.environ.get('OPENCLAW_EMAIL_TO', from_addr)

    if not all([smtp_host, smtp_port, smtp_user, smtp_pass]):
        log("SMTP not configured, skipping email alert")
        return False

    try:
        msg = MIMEText(body)
        msg['Subject'] = subject
        msg['From'] = from_addr
        msg['To'] = to_addr
        with smtplib.SMTP(smtp_host, int(smtp_port)) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
        log(f"Email alert sent to {to_addr}")
        return True
    except Exception as e:
        log(f"Email alert send failed: {e}")
        return False

def main():
    threshold_minutes = 15
    now = datetime.utcnow()
    alert_needed = False
    message_parts = []

    if not os.path.exists(HEARTBEAT_FILE):
        message_parts.append("HEARTBEAT FILE MISSING: The recreation-check may not be running.")
        alert_needed = True
    else:
        try:
            with open(HEARTBEAT_FILE, 'r') as f:
                data = json.load(f)
            last_run_str = data.get('last_run')
            success = data.get('success', True)
            if not last_run_str:
                message_parts.append("HEARTBEAT INVALID: Missing last_run timestamp.")
                alert_needed = True
            else:
                last_run = datetime.strptime(last_run_str, "%Y-%m-%dT%H:%M:%SZ")
                age = now - last_run
                minutes = age.total_seconds() / 60
                log(f"Last run: {last_run_str} ({minutes:.1f} minutes ago), success: {success}")
                if minutes > threshold_minutes:
                    message_parts.append(f"STALE HEARTBEAT: Last successful run was {minutes:.0f} minutes ago (threshold: {threshold_minutes} min).")
                    alert_needed = True
                if not success:
                    message_parts.append("LAST RUN FAILED: The most recent check ended with an error.")
                    alert_needed = True
        except Exception as e:
            message_parts.append(f"HEARTBEAT READ ERROR: {e}")
            alert_needed = True

    if alert_needed:
        full_message = "🚨 RECREATION-CHECK MONITOR ALERT:\n\n" + "\n".join(message_parts) + "\n\nPlease investigate the cron job and logs."
        log(f"ALERT: {full_message}")
        # Send via Telegram and Email (if configured)
        send_telegram_alert(full_message)
        send_email_alert("Recreation-Check Monitor Alert", full_message)
        sys.exit(1)
    else:
        log("Heartbeat check passed.")
        sys.exit(0)

if __name__ == '__main__':
    main()
