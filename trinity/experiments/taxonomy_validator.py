#!/usr/bin/env python3
"""
Taxonomy Validator for Netic call classification definitions.
Parses the markdown table(s) from `inbound_drilldown_analytics_definitions.md`,
validates required fields, detects duplicates, and exports to JSON.
"""

import os
import json
import re
import sys
from collections import defaultdict

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WORKSPACE_ROOT = os.path.abspath(os.path.join(BASE_DIR, '..', '..'))
INPUT_MD = os.path.join(WORKSPACE_ROOT, 'netic_definitions.md')
OUTPUT_JSON = os.path.join(BASE_DIR, 'taxonomy.json')

def is_table_row(line):
    return line.strip().startswith('|') and line.strip().endswith('|')

def is_separator_row(line):
    # Typical separator: |---|---|---| or with colons
    stripped = line.strip().strip('|')
    if not stripped:
        return False
    cells = stripped.split('|')
    # Each cell should consist of dashes and optional colons
    return all(re.fullmatch(r':?-+:?', cell.strip()) for cell in cells if cell.strip())

def split_row(line):
    # Split by pipe, ignore first and last empty cells resulting from leading/trailing pipes
    parts = line.split('|')
    # Remove first and last if empty (due to leading/trailing pipe)
    if parts and parts[0].strip() == '':
        parts = parts[1:]
    if parts and parts[-1].strip() == '':
        parts = parts[:-1]
    return [p.strip() for p in parts]

def parse_table(rows):
    """Parse a block of table rows into a list of dicts.
    rows: list of lines (strings) that are part of a table block, starting with header row.
    Returns list of row dicts and the header list.
    """
    if not rows:
        return [], []
    header_row = rows[0]
    headers = split_row(header_row)
    # Expect a separator row next, skip it
    data_rows = rows[2:] if len(rows) > 1 and is_separator_row(rows[1]) else rows[1:]
    records = []
    last_seen = [None] * len(headers)
    for line in data_rows:
        if not is_table_row(line):
            continue
        cells = split_row(line)
        # Pad or truncate to match header count
        if len(cells) < len(headers):
            cells += [''] * (len(headers) - len(cells))
        elif len(cells) > len(headers):
            cells = cells[:len(headers)]
        # Propagate empty cells from last_seen
        propagated = []
        for i, cell in enumerate(cells):
            if cell == '':
                propagated.append(last_seen[i])
            else:
                propagated.append(cell)
                last_seen[i] = cell
        # Build dict
        record = dict(zip(headers, propagated))
        records.append(record)
    return records, headers

def read_markdown_file(path):
    with open(path) as f:
        lines = f.readlines()
    # Split into table blocks: consecutive lines that are table rows
    table_blocks = []
    current_block = []
    inside_table = False
    for line in lines:
        if is_table_row(line):
            if not inside_table:
                # start new block
                inside_table = True
                current_block = [line]
            else:
                current_block.append(line)
        else:
            if inside_table:
                # End current block
                table_blocks.append(current_block)
                inside_table = False
                current_block = []
            # else continue
    if inside_table and current_block:
        table_blocks.append(current_block)
    return table_blocks

def main():
    print(f"[*] Parsing {INPUT_MD}")
    blocks = read_markdown_file(INPUT_MD)
    all_outcomes = []
    all_transfers = []
    # Heuristic: first table is outcomes, second is transfers
    for i, block in enumerate(blocks):
        records, headers = parse_table(block)
        if i == 0:
            all_outcomes.extend(records)
        elif i == 1:
            all_transfers.extend(records)
        else:
            # ignore extra tables
            pass
        print(f"  Block {i}: {len(records)} rows, headers: {headers}")

    print(f"[*] Parse totals: {len(all_outcomes)} outcome entries, {len(all_transfers)} transfer entries")

    # Validate
    required_fields = ['Outcome', 'Reason', 'Subreason']
    warnings = []
    errors = []
    for rec in all_outcomes + all_transfers:
        for field in required_fields:
            if not rec.get(field):
                err = f"Missing {field} in record: {rec}"
                errors.append(err)
    # Duplicate detection: based on (Outcome, Reason, Subreason)
    seen_combos = defaultdict(int)
    for rec in all_outcomes + all_transfers:
        key = (rec.get('Outcome'), rec.get('Reason'), rec.get('Subreason'))
        seen_combos[key] += 1
    duplicates = {k: c for k, c in seen_combos.items() if c > 1}
    print(f"[*] Duplicate combinations (across both tables): {len(duplicates)}")
    for k, c in duplicates.items():
        warnings.append(f"Duplicate {k} appears {c} times")

    # Check for empty Technical fields in outcomes
    for rec in all_outcomes:
        if rec.get('Technical', '') == '':
            warnings.append(f"Empty Technical field for {rec.get('Outcome')}, {rec.get('Reason')}, {rec.get('Subreason')}")

    # Export to JSON
    output = {
        "outcomes": all_outcomes,
        "transfers": all_transfers,
        "metadata": {
            "generated_at": datetime.datetime.utcnow().isoformat(),
            "source_file": os.path.basename(INPUT_MD),
            "counts": {
                "outcomes": len(all_outcomes),
                "transfers": len(all_transfers)
            },
            "duplicate_count": len(duplicates),
            "warnings": warnings,
            "errors": errors
        }
    }
    with open(OUTPUT_JSON, 'w') as f:
        json.dump(output, f, indent=2)
    print(f"[+] Exported JSON to {OUTPUT_JSON}")

    # Print summary
    print("\n=== Validation Summary ===")
    if errors:
        print("ERRORS:")
        for e in errors:
            print(f"  - {e}")
    else:
        print("No missing required fields.")
    if warnings:
        print("WARNINGS:")
        for w in warnings[:10]:
            print(f"  - {w}")
        if len(warnings) > 10:
            print(f"  ... and {len(warnings)-10} more")
    else:
        print("No warnings.")
    print(f"Total entries parsed: {len(all_outcomes) + len(all_transfers)}")
    print(f"Duplicate combos: {len(duplicates)}")

    # Write a human-readable summary to a file as well (for digest)
    summary_path = os.path.join(BASE_DIR, 'validation_summary.txt')
    with open(summary_path, 'w') as f:
        f.write(f"Netic Taxonomy Validation Summary\n")
        f.write(f"Source: {INPUT_MD}\n")
        f.write(f"Generated: {output['metadata']['generated_at']}\n\n")
        f.write(f"Outcomes: {len(all_outcomes)}\n")
        f.write(f"Transfers: {len(all_transfers)}\n")
        f.write(f"Total entries: {len(all_outcomes)+len(all_transfers)}\n")
        f.write(f"Duplicate combinations: {len(duplicates)}\n")
        if errors:
            f.write("\nErrors:\n")
            for e in errors:
                f.write(f"- {e}\n")
        if warnings:
            f.write("\nWarnings (first 20):\n")
            for w in warnings[:20]:
                f.write(f"- {w}\n")
            if len(warnings) > 20:
                f.write(f"... and {len(warnings)-20} more\n")
    print(f"[+] Text summary: {summary_path}")

    return 0 if not errors else 1

if __name__ == '__main__':
    import datetime
    sys.exit(main())
