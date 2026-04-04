#!/usr/bin/env python3
"""
Daily export scheduler (run this script in background or via systemd/cron).
It will trigger the export at the configured time each day.
"""
import schedule
import time
import os
from datetime import datetime
from export import run_daily_export

def job():
    print(f"[{datetime.now()}] Running daily export job...")
    try:
        run_daily_export()
    except Exception as e:
        print(f"Export failed: {e}")

if __name__ == "__main__":
    # Configure run time (24h format)
    RUN_AT = os.getenv("RUN_AT", "06:00")
    schedule.every().day.at(RUN_AT).do(job)
    print(f"Scheduler started. Will run daily at {RUN_AT}.")
    while True:
        schedule.run_pending()
        time.sleep(30)