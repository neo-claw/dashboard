#!/usr/bin/env python3
"""
Daily Utilization Export: Generates CSV reports for stakeholders.
Runs daily (e.g., via cron) to produce:
- utilization_historical_YYYY-MM-DD.csv (last 30 days)
- utilization_forecast_YYYY-MM-DD.csv (next 10 days)
"""

import csv
import os
from datetime import datetime, timedelta
from pathlib import Path

BASE_DIR = Path(__file__).parent
DATA_CSV = BASE_DIR / 'data' / 'utilization_data.csv'
EXPORTS_DIR = BASE_DIR / 'exports'
EXPORTS_DIR.mkdir(exist_ok=True)

def load_data():
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

def generate_exports():
    today = datetime.now().date()
    rows = load_data()

    # Historical: last 30 days ending yesterday
    historical_end = today - timedelta(days=1)
    historical_start = historical_end - timedelta(days=29)
    historical = [r for r in rows if historical_start <= r['date'] <= historical_end]

    # Forecast: next 10 days starting today
    forecast_start = today
    forecast_end = today + timedelta(days=9)
    forecast = [r for r in rows if forecast_start <= r['date'] <= forecast_end]

    fieldnames = ['date', 'tenant_id', 'tenant_name', 'business_unit', 'capacity_pct', 'shift_hours_booked', 'shift_hours_available']

    # Write historical CSV
    hist_file = EXPORTS_DIR / f'utilization_historical_{today.strftime("%Y-%m-%d")}.csv'
    with open(hist_file, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in historical:
            row_copy = r.copy()
            row_copy['date'] = r['date'].strftime('%Y-%m-%d')
            writer.writerow(row_copy)

    # Write forecast CSV
    fore_file = EXPORTS_DIR / f'utilization_forecast_{today.strftime("%Y-%m-%d")}.csv'
    with open(fore_file, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in forecast:
            row_copy = r.copy()
            row_copy['date'] = r['date'].strftime('%Y-%m-%d')
            writer.writerow(row_copy)

    print(f"Generated: {hist_file} ({len(historical)} rows)")
    print(f"Generated: {fore_file} ({len(forecast)} rows)")
    return hist_file, fore_file

if __name__ == '__main__':
    generate_exports()