#!/usr/bin/env python3
"""
Netic Utilization Data Ingestion Pipeline
Fetches the latest utilization CSV report from a Google Drive folder
and writes it to the master data file consumed by the dashboard.
"""

import os
import json
import subprocess
import sys
from datetime import datetime

# Configuration (env vars)
DRIVE_FOLDER_ID = os.getenv("DRIVE_FOLDER_ID")
MASTER_CSV = os.getenv("MASTER_CSV", "/home/ubuntu/.openclaw/workspace/trinity/experiments/nash-utilization-dashboard/data/master.csv")
STATE_FILE = os.getenv("INGEST_STATE", "/home/ubuntu/.openclaw/workspace/trinity/experiments/netic_ingest/ingest_state.json")

if not DRIVE_FOLDER_ID:
    print("ERROR: DRIVE_FOLDER_ID environment variable is required.", file=sys.stderr)
    sys.exit(1)

def log(msg):
    print(f"[{datetime.utcnow().isoformat()}] {msg}")

def run_gws(args):
    """Run gws CLI and return parsed JSON output."""
    cmd = ["gws"] + args
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    except subprocess.CalledProcessError as e:
        log(f"gws call failed: {e} -> {e.stderr}")
        raise
    # If output format is json, parse it
    if "--format" in args and "json" in args:
        try:
            return json.loads(result.stdout)
        except json.JSONDecodeError as e:
            log(f"Failed to parse JSON from gws: {e}")
            log(f"Output: {result.stdout}")
            raise
    return result.stdout

def find_latest_csv():
    """List CSV files in the configured Drive folder and return the most recent one."""
    query = f"'{DRIVE_FOLDER_ID}' in parents and mimeType = 'text/csv'"
    args = [
        "drive", "files", "list",
        "--params", json.dumps({"q": query, "orderBy": "createdTime desc", "pageSize": 5}),
        "--format", "json"
    ]
    data = run_gws(args)
    files = data.get("files", [])
    if not files:
        log("No CSV files found in Drive folder.")
        return None
    # Return the first (most recent)
    latest = files[0]
    log(f"Found latest CSV: {latest['name']} (id={latest['id']})")
    return latest

def download_file(file_id, local_path):
    """Download a file from Drive to local path."""
    args = [
        "drive", "files", "get",
        "--params", json.dumps({"fileId": file_id, "alt": "media"}),
        "--output", local_path
    ]
    log(f"Downloading file {file_id} to {local_path}...")
    run_gws(args)
    log("Download complete.")

def load_state():
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE) as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            return {"last_file_id": None}
    return {"last_file_id": None}

def save_state(state):
    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)

def validate_csv(csv_path):
    """Check that CSV has required columns; print warning if not."""
    import csv
    with open(csv_path, newline='') as f:
        reader = csv.DictReader(f)
        if reader.fieldnames is None:
            print(f"ERROR: {csv_path} has no header row.")
            return False
        required = {"date", "tenant", "business_unit", "total_available_hours", "booked_hours"}
        missing = required - set(reader.fieldnames)
        if missing:
            print(f"WARNING: {csv_path} missing columns: {missing}. Has: {reader.fieldnames}")
            # Still allow; dashboard may fail if columns missing
            return False
    return True

def perform_ingest(latest_file, tmp_download_path, master_csv, state):
    """Core ingest logic: validate and replace master_csv."""
    file_id = latest_file["id"]
    if state.get("last_file_id") == file_id:
        log(f"Latest file already processed (id={file_id}). Skipping.")
        return False

    # Download to temporary location
    download_file(file_id, tmp_download_path)

    # Validate
    if not validate_csv(tmp_download_path):
        log("Validation failed. Skipping ingestion.")
        os.remove(tmp_download_path)
        return False

    # Ensure master directory exists
    os.makedirs(os.path.dirname(master_csv), exist_ok=True)

    # Replace master.csv with new file
    import shutil
    shutil.move(tmp_download_path, master_csv)
    log(f"Master data updated at {master_csv}")

    # Update state
    state["last_file_id"] = file_id
    state["last_ingest_utc"] = datetime.utcnow().isoformat()
    save_state(state)
    log("Ingest complete.")
    return True

def main():
    # Test/debug mode: --test <csvfile> will skip Drive and use provided CSV as the "latest"
    if len(sys.argv) > 1 and sys.argv[1] == "--test" and len(sys.argv) == 3:
        test_csv = sys.argv[2]
        log(f"TEST MODE: using {test_csv} as the latest report")
        state = load_state()
        master_csv = MASTER_CSV
        # Simulate a latest file object
        latest_file = {"id": "test123", "name": os.path.basename(test_csv)}
        tmp_path = test_csv  # use directly, don't move from remote
        # But we don't want to delete the test file after; copy it
        import shutil
        tmp_copy = f"/tmp/netic_ingest_test_master.csv"
        shutil.copy2(tmp_path, tmp_copy)
        # Validate first
        if not validate_csv(tmp_copy):
            log("Validation failed. Exiting.")
            sys.exit(1)
        # Perform ingest (replace master)
        os.makedirs(os.path.dirname(master_csv), exist_ok=True)
        shutil.move(tmp_copy, master_csv)
        state["last_file_id"] = "test123"
        state["last_ingest_utc"] = datetime.utcnow().isoformat()
        save_state(state)
        log(f"TEST: Master data updated at {master_csv}")
        return

    # Normal operation
    state = load_state()
    latest = find_latest_csv()
    if not latest:
        log("No CSV to ingest.")
        return

    tmp_path = f"/tmp/netic_ingest_{latest['id']}.csv"
    success = perform_ingest(latest, tmp_path, MASTER_CSV, state)
    if not success:
        # Already logged
        pass

if __name__ == "__main__":
    main()
