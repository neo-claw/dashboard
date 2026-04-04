#!/usr/bin/env python3
"""
Update Netic Utilization Dashboard data and generate daily reports.
Runs daily via cron.

Produces:
- data.json (for dashboard frontend)
- exports/utilization_historical_YYYY-MM-DD.csv
- exports/utilization_forecast_YYYY-MM-DD.csv
"""

import csv
import json
import os
from datetime import datetime, timedelta
from pathlib import Path

BASE_DIR = Path(__file__).parent
DATA_CSV = BASE_DIR / 'data' / 'utilization_data.csv'
DASHBOARD_DATA_JSON = BASE_DIR / 'data.json'  # Dashboard expects this at root
DASHBOARD_DIR = BASE_DIR.parent / 'utilization_dashboard'  # also copy here for live view
EXPORTS_DIR = BASE_DIR / 'exports'
EXPORTS_DIR.mkdir(exist_ok=True)

def load_csv():
    rows = []
    with open(DATA_CSV, newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            row['capacity_pct'] = float(row['capacity_pct'])
            row['shift_hours_booked'] = int(row['shift_hours_booked'])
            row['shift_hours_available'] = int(row['shift_hours_available'])
            row['date'] = datetime.strptime(row['date'], '%Y-%m-%d').date()
            rows.append(row)
    return rows

def generate_dashboard_json(rows):
    """Generate data.json for dashboard consumption."""
    # Dashboard expects: { "meta": { "generated": "...", "description": "..." }, "records": [...] }
    # Convert date objects to strings
    records = []
    for r in rows:
        rec = {
            'date': r['date'].strftime('%Y-%m-%d'),
            'tenant_id': r['tenant_id'],
            'tenant_name': r['tenant_name'],
            'business_unit': r['business_unit'],
            'capacity_pct': r['capacity_pct'],
            'shift_hours_booked': r['shift_hours_booked'],
            'shift_hours_available': r['shift_hours_available']
        }
        records.append(rec)

    data = {
        'meta': {
            'generated': datetime.now().strftime('%Y-%m-%dT%H:%M:%SZ'),
            'description': 'Utilization data for Netic dashboard'
        },
        'records': records
    }
    # Write to pipeline root
    with open(DASHBOARD_DATA_JSON, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"Wrote data.json with {len(records)} records to {DASHBOARD_DATA_JSON}")

    # Also copy to dashboard directory for live view
    if DASHBOARD_DIR.exists():
        dest = DASHBOARD_DIR / 'data.json'
        with open(dest, 'w') as f:
            json.dump(data, f, indent=2)
        print(f"Copied data.json to dashboard at {dest}")

def generate_daily_exports(rows):
    today = datetime.now().date()
    # Historical: last 30 days ending yesterday
    hist_end = today - timedelta(days=1)
    hist_start = hist_end - timedelta(days=29)
    historical = [r for r in rows if hist_start <= r['date'] <= hist_end]

    # Forecast: next 10 days starting today
    fore_start = today
    fore_end = today + timedelta(days=9)
    forecast = [r for r in rows if fore_start <= r['date'] <= fore_end]

    fieldnames = ['date', 'tenant_id', 'tenant_name', 'business_unit', 'capacity_pct', 'shift_hours_booked', 'shift_hours_available']

    hist_file = EXPORTS_DIR / f'utilization_historical_{today.strftime("%Y-%m-%d")}.csv'
    with open(hist_file, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in historical:
            row_copy = r.copy()
            row_copy['date'] = r['date'].strftime('%Y-%m-%d')
            writer.writerow(row_copy)

    fore_file = EXPORTS_DIR / f'utilization_forecast_{today.strftime("%Y-%m-%d")}.csv'
    with open(fore_file, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in forecast:
            row_copy = r.copy()
            row_copy['date'] = r['date'].strftime('%Y-%m-%d')
            writer.writerow(row_copy)

    print(f"Generated historical ({len(historical)} rows) and forecast ({len(forecast)} rows) CSVs")

def main():
    rows = load_csv()
    generate_dashboard_json(rows)
    generate_daily_exports(rows)
    print("Dashboard update complete.")

if __name__ == '__main__':
    main()