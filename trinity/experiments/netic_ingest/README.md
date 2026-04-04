# Netic Utilization Data Ingestion

Automates the ingestion of daily utilization reports from Google Drive into the master CSV consumed by the Nash Utilization Dashboard.

## Purpose

Hoffmann (Nash) will provide a daily CSV report of capacity and booked hours. This pipeline:
- Monitors a configured Google Drive folder for the latest CSV report.
- Validates required columns.
- Writes the data to `master.csv` used by the dashboard's "Production Master" data source.

Once set up, the dashboard can be switched to "Production Master (auto-ingested)" to display real data.

## Prerequisites

- `gws` CLI installed and authenticated.
- A Google Drive folder where Hoffmann will drop CSV reports (e.g., `netic/utilization`).
- Permissions for `gws` to access that folder.

## Setup

1. Create a Google Drive folder (e.g., "Netic Utilization Reports").
2. Configure environment variables:
   - `DRIVE_FOLDER_ID`: the Drive folder ID.
   - `MASTER_CSV` (optional): path to master CSV. Defaults to `../nash-utilization-dashboard/data/master.csv` relative to this script.
   - `INGEST_STATE` (optional): path to state file. Defaults to `ingest_state.json` in this directory.
3. Ensure the dashboard app (`nash-utilization-dashboard/app.py`) is available and the `data/master.csv` path matches.

Example `.env`:
```bash
DRIVE_FOLDER_ID=1gQfWzzqrRnp14cOq_Ay9O9BU1-e8eEr6
MASTER_CSV=/home/ubuntu/.openclaw/workspace/trinity/experiments/nash-utilization-dashboard/data/master.csv
```

## Running

### Manual
```bash
cd /home/ubuntu/.openclaw/workspace/trinity/experiments/netic_ingest
DRIVE_FOLDER_ID=your-folder-id python3 ingest.py
```

### Test mode (without Drive)
Use a local CSV file to simulate ingestion:
```bash
DRIVE_FOLDER_ID=dummy MASTER_CSV=../nash-utilization-dashboard/data/master.csv python3 ingest.py --test sample_hoffmann_report.csv
```

### Scheduling

Recommended: run every 30 minutes via cron:
```cron
*/30 * * * * cd /home/ubuntu/.openclaw/workspace/trinity/experiments/netic_ingest && DRIVE_FOLDER_ID=your-folder-id /usr/bin/python3 ingest.py >> /var/log/netic_ingest.log 2>&1
```

Or use the provided `scheduler.py` pattern (requires `schedule` library).

## Data Format

The incoming CSV must have these exact columns:
- `date` (YYYY-MM-DD)
- `tenant` (string)
- `business_unit` (string)
- `total_available_hours` (numeric)
- `booked_hours` (numeric)

Optional additional columns are ignored.

The pipeline expects a **full snapshot** each day (i.e., the CSV contains the complete dataset for all dates). The latest file replaces the previous master.

If incremental data is provided instead, the pipeline would need to be enhanced to upsert.

## Dashboard Integration

In the Nash Utilization Dashboard, select data source:
**Production Master (auto-ingested)**.

If the master CSV exists and is valid, the dashboard will display historical and forward-looking utilization with export capability.

## Troubleshooting

- `gws` errors: ensure authentication (`gws auth login`) and that the Drive folder ID is correct.
- Validation warnings: check CSV headers and date format.
- Stale data: check `ingest_state.json` to see last processed file ID.

## Next Steps

- Add email export for production master (reuse `export.py` from dashboard).
- Alert on ingestion failures (via Telegram or email).
- Handle incremental updates with upsert logic.
