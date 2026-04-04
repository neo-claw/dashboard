#!/usr/bin/env python3
"""
Calendar Exporter for Deadline Tracker

Converts deadlines JSON to iCalendar (.ics) format for import into Google Calendar
or other calendar applications.

Usage:
    python3 export_calendar.py [input_json] [output_ics]

Defaults:
    input_json: deadlines_YYYY-MM-DD.json (latest in directory)
    output_ics: deadlines_YYYY-MM-DD.ics
"""

import json
import sys
import os
from datetime import datetime

def find_latest_json(dir_path):
    """Find the latest deadlines_*.json file in the given directory."""
    files = [f for f in os.listdir(dir_path) if f.startswith('deadlines_') and f.endswith('.json')]
    if not files:
        return None
    # Sort by date in filename
    files.sort(reverse=True)
    return os.path.join(dir_path, files[0])

def generate_uid(event, index):
    """Generate a stable UID for the event."""
    date = event.get('date_parsed', 'unknown')
    context_snippet = event.get('context', '')[:50].replace(' ', '_')
    return f"trinity-deadline-{date}-{index}@openclaw"

def escape_ics_text(text):
    """Escape commas, semicolons, and newlines per iCalendar spec."""
    text = text.replace('\\', '\\\\')
    text = text.replace('\n', '\\n')
    text = text.replace(',', '\\,')
    text = text.replace(';', '\\;')
    return text

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    input_json = None
    output_ics = None

    if len(sys.argv) > 1:
        input_json = sys.argv[1]
    if len(sys.argv) > 2:
        output_ics = sys.argv[2]

    if not input_json:
        input_json = find_latest_json(base_dir)
        if not input_json:
            print("Error: No deadlines JSON found.", file=sys.stderr)
            sys.exit(1)

    if not output_ics:
        # Derive from input filename
        base = os.path.basename(input_json)
        date_part = base.replace('deadlines_', '').replace('.json', '')
        output_ics = os.path.join(base_dir, f"deadlines_{date_part}.ics")

    with open(input_json, 'r') as f:
        events = json.load(f)

    ics_lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Trinity//Deadline Exporter//EN",
        "CALSCALE:GREGORIAN"
    ]

    for idx, event in enumerate(events):
        date_str = event.get('date_parsed')
        if not date_str:
            continue
        # All-day event: use DATE format (no time)
        dtstart = f"{date_str.replace('-', '')}"
        dtend = f"{date_str.replace('-', '')}"  # same day

        uid = generate_uid(event, idx)
        context = event.get('context', '').strip()
        source = event.get('source', '')
        line = event.get('line', '')

        summary = f"Deadline: {context[:80]}" if context else "Deadline (no context)"
        description = f"Source: {source} (line {line})\n\n{context}"

        ics_lines.extend([
            "BEGIN:VEVENT",
            f"UID:{uid}",
            f"DTSTART;VALUE=DATE:{dtstart}",
            f"DTEND;VALUE=DATE:{dtend}",
            f"SUMMARY:{escape_ics_text(summary)}",
            f"DESCRIPTION:{escape_ics_text(description)}",
            "END:VEVENT"
        ])

    ics_lines.append("END:VCALENDAR")

    with open(output_ics, 'w') as f:
        f.write('\r\n'.join(ics_lines))

    print(f"Exported {len(events)} events to {output_ics}")

if __name__ == "__main__":
    main()
