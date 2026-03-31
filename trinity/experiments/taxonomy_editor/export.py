#!/usr/bin/env python3
"""Export outcomes.json to a markdown table."""

import json
import sys
from pathlib import Path

def main():
    base_dir = Path(__file__).parent
    json_path = base_dir / 'data' / 'outcomes.json'
    output_path = base_dir / 'outcomes_table.md'

    with json_path.open('r', encoding='utf-8') as f:
        data = json.load(f)

    if not data:
        print("No data to export.")
        return

    # Assume all dicts have same keys
    headers = list(data[0].keys())
    # Build header row
    header_row = '| ' + ' | '.join(headers) + ' |'
    separator_row = '| ' + ' | '.join(['---'] * len(headers)) + ' |'

    lines = [header_row, separator_row]

    for entry in data:
        row = []
        for h in headers:
            cell = entry.get(h, '')
            # Escape any pipe characters in cell content
            cell = str(cell).replace('|', '\\|')
            row.append(cell)
        lines.append('| ' + ' | '.join(row) + ' |')

    output_path.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print(f"Exported markdown table to {output_path}")

    # Also print a snippet to stdout for quick view
    print("\nFirst few lines:")
    print('\n'.join(lines[:5]))

if __name__ == '__main__':
    main()
