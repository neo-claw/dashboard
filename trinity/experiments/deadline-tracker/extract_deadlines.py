#!/usr/bin/env python3
"""
Deadline Unification Engine

Scans workspace notes for date references and deadline cues,
extracts context, and produces a unified upcoming deadlines report.

Target domains:
- School assignments/exams (school_*.md, running_notes.md)
- Netic opportunities (netic_*.md, inbound.md)
- Personal/thoughts (thoughts_*.md)
- Any markdown in notes/, notes_drive/, notes_tmp/

Outputs:
- upcoming_deadlines.md      Human-readable sorted by date
- deadlines_YYYY-MM-DD.json  Structured data for downstream tools
"""

import os
import re
import json
import argparse
from datetime import datetime, date, timedelta
from pathlib import Path
from dateutil import parser as dateparser

# Config
WORKSPACE = Path.home() / ".openclaw" / "workspace"
NOTE_DIRS = [
    WORKSPACE / "notes",
    WORKSPACE / "notes_drive",
    WORKSPACE / "notes_tmp",
    WORKSPACE / "trinity" / "notes",
]
# Also scan specific note files in root
ROOT_NOTES = [
    "running_notes.md",
    "school_note.md",
    "netic_note.md",
    "strat-uber-lyft.md",
    "inbound_drilldown_analytics_definitions.md",
    "meeting_notes_feb25.md",
]

# Patterns
DATE_PATTERNS = [
    # ISO dates: 2026-04-15, 2026/04/15
    r'\b(?:19|20)\d{2}[-/](?:0[1-9]|1[0-2])[-/](?:0[1-9]|[12]\d|3[01])\b',
    # US dates: April 15, 2026 or Apr 15 2026
    r'\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[, ]+(0[1-9]|[12]\d|3[01]),? (?:19|20)\d{2}\b',
    # Relative: next Monday, tomorrow, in 3 days
    r'\b(?:next\s+(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)|tomorrow|today|in\s+\d+\s+days?)\b',
]
DEADLINE_CUES = r'\b(?:due|deadline|by|submit\s+by|finish\s+by|complete\s+by|on\s+or\s+before|no\s+later\s+than|must\s+be\s+done\s+by)\b'

def extract_dates_and_context(text, source_path):
    """Find date mentions near deadline cues. Returns list of dicts."""
    results = []
    lines = text.split('\n')
    for i, line in enumerate(lines):
        line_lower = line.lower()
        # Check if line contains a deadline cue
        if not re.search(DEADLINE_CUES, line_lower):
            continue
        # Find all date patterns in this line
        for pattern in DATE_PATTERNS:
            for match in re.finditer(pattern, line, re.IGNORECASE):
                date_str = match.group()
                context = line.strip()
                results.append({
                    'date_raw': date_str,
                    'context': context,
                    'source': str(source_path),
                    'line': i + 1,
                })
    return results

def parse_date(date_str):
    """Convert date string to date object. Returns None if unparseable."""
    try:
        # Handle relative dates
        today = date.today()
        if date_str.lower() == 'today':
            return today
        if date_str.lower() == 'tomorrow':
            return today + timedelta(days=1)
        m = re.match(r'next\s+(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)', date_str, re.IGNORECASE)
        if m:
            target_day = m.group(1).lower()
            days_ahead = {'monday':0, 'tuesday':1, 'wednesday':2, 'thursday':3, 'friday':4, 'saturday':5, 'sunday':6}
            today_weekday = today.weekday()  # Monday=0
            target_weekday = days_ahead[target_day]
            days_until = (target_weekday - today_weekday) % 7
            if days_until == 0:
                days_until = 7
            return today + timedelta(days=days_until)
        m = re.match(r'in\s+(\d+)\s+days?', date_str, re.IGNORECASE)
        if m:
            return today + timedelta(days=int(m.group(1)))
        # Use dateutil parser for absolute dates
        dt = dateparser.parse(date_str, fuzzy=True, default=datetime.combine(today, datetime.min.time()))
        if dt:
            return dt.date()
    except Exception:
        return None
    return None

def scan_paths(paths):
    all_deadlines = []
    for root_dir in paths:
        if not root_dir.exists():
            continue
        # Walk directory
        for dirpath, _, filenames in os.walk(root_dir):
            for fname in filenames:
                if not fname.endswith('.md'):
                    continue
                fpath = Path(dirpath) / fname
                try:
                    text = fpath.read_text(encoding='utf-8', errors='ignore')
                except Exception as e:
                    continue
                extracted = extract_dates_and_context(text, fpath)
                for item in extracted:
                    parsed = parse_date(item['date_raw'])
                    if parsed:
                        item['date_parsed'] = parsed.isoformat()
                        item['days_until'] = (parsed - date.today()).days
                        all_deadlines.append(item)
    return all_deadlines

def main():
    parser = argparse.ArgumentParser(description='Extract deadlines from note files')
    parser.add_argument('--output-dir', default=str(WORKSPACE / 'trinity' / 'experiments' / 'deadline-tracker'))
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Collect all sources: note dirs + specific root files
    paths = NOTE_DIRS[:]
    for fname in ROOT_NOTES:
        fpath = WORKSPACE / fname
        if fpath.exists():
            paths.append(fpath)

    deadlines = scan_paths(paths)

    # Deduplicate by (source, line) roughly
    seen = set()
    unique = []
    for d in deadlines:
        key = (d['source'], d['line'])
        if key not in seen:
            seen.add(key)
            unique.append(d)

    # Sort by parsed date ascending
    unique.sort(key=lambda x: x['date_parsed'])

    # Write JSON
    today_str = date.today().isoformat()
    json_path = output_dir / f'deadlines_{today_str}.json'
    with open(json_path, 'w') as f:
        json.dump(unique, f, indent=2)

    # Write Markdown report
    md_path = output_dir / 'upcoming_deadlines.md'
    with open(md_path, 'w') as f:
        f.write(f"# Upcoming Deadlines (generated {datetime.now().isoformat(timespec='minutes')})\n\n")
        if not unique:
            f.write("No upcoming deadlines detected.\n")
        else:
            current_date = None
            for d in unique:
                if d['date_parsed'] != current_date:
                    current_date = d['date_parsed']
                    f.write(f"## {current_date}\n\n")
                f.write(f"- **{d['days_until']} days until** (from {Path(d['source']).name} line {d['line']}): {d['context']}\n")
            f.write(f"\n**Total upcoming deadlines:** {len(unique)}\n")

    print(f"Extracted {len(unique)} deadlines. JSON: {json_path}, Markdown: {md_path}")

if __name__ == '__main__':
    main()
