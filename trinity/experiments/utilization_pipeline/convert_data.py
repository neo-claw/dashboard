#!/usr/bin/env python3
"""Convert existing data.json to CSV for utilization pipeline."""

import json
import csv
from pathlib import Path

# Paths
data_json = Path('/home/ubuntu/.openclaw/workspace/trinity/experiments/utilization_dashboard/data.json')
output_csv = Path('/home/ubuntu/.openclaw/workspace/trinity/experiments/utilization_pipeline/data/utilization_data.csv')

# Load JSON
with open(data_json) as f:
    data = json.load(f)

records = data.get('records', [])

# Write CSV
if records:
    fieldnames = ['date', 'tenant_id', 'tenant_name', 'business_unit', 'capacity_pct', 'shift_hours_booked', 'shift_hours_available']
    with open(output_csv, 'w', newline='') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        for r in records:
            writer.writerow(r)
    print(f"Wrote {len(records)} records to {output_csv}")
else:
    print("No records found in data.json")