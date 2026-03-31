#!/usr/bin/env python3
"""Parse inbound.md and extract the primary outcome classification table into JSON."""

import re
import json
from pathlib import Path

def extract_table(lines):
    """Find the first markdown table and return header and rows as lists of strings."""
    in_table = False
    header = None
    rows = []
    separator_seen = False

    for line in lines:
        line = line.rstrip('\n')
        # Detect start of table: line starts with '|'
        if line.startswith('|'):
            # Remove leading/trailing '|' and split by '|'
            parts = [p.strip() for p in line.strip('|').split('|')]
            # If this line is a separator (contains only dashes or spaces and dashes)
            if all(re.fullmatch(r'[-:\s]*', p) for p in parts):
                separator_seen = True
                continue
            # If we haven't seen separator yet, this is header
            if not separator_seen:
                header = parts
                in_table = True
            else:
                # This is a row
                rows.append(parts)
        else:
            # Empty line or other content: if we're in table, stop at first blank
            if in_table and line.strip() == '':
                break
            # Reset if not in table
            in_table = False
            separator_seen = False
    return header, rows

def fill_forward(matrix):
    """Forward-fill blanks in each column to replace empty inherited cells."""
    if not matrix:
        return matrix
    n_cols = len(matrix[0])
    last = [None] * n_cols
    for row in matrix:
        # Ensure row has n_cols entries
        if len(row) < n_cols:
            row.extend([''] * (n_cols - len(row)))
        for i in range(n_cols):
            cell = row[i].strip()
            if cell != '':
                last[i] = row[i]
            else:
                if last[i] is not None:
                    row[i] = last[i]
                else:
                    row[i] = ''
    return matrix

def main():
    base_dir = Path(__file__).parent
    inbound_path = base_dir / 'inbound_original.md'
    output_path = base_dir / 'data' / 'outcomes.json'

    with inbound_path.open('r', encoding='utf-8') as f:
        lines = f.readlines()

    header, rows = extract_table(lines)
    if header is None:
        print("No table found.")
        return

    # Forward-fill rows to make explicit values
    rows = fill_forward(rows)

    # Convert to dicts
    data = []
    for row in rows:
        row = row[:len(header)]  # truncate if extra
        entry = dict(zip(header, row))
        data.append(entry)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open('w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"Extracted {len(data)} rows to {output_path}")

if __name__ == '__main__':
    main()
