#!/usr/bin/env python3
"""
Daily Summary Generator for Trinity.
Scans configured markdown files for changes since last run,
generates a summary and appends to TRINITY.md.
"""

import os
import json
import datetime
import hashlib

# Determine paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WORKSPACE_ROOT = os.path.abspath(os.path.join(BASE_DIR, '..', '..'))
STATE_FILE = os.path.join(WORKSPACE_ROOT, 'trinity', 'summary_state.json')
OUTPUT_FILE = os.path.join(WORKSPACE_ROOT, 'TRINITY.md')

# List of note files to monitor (relative to WORKSPACE_ROOT)
INPUT_FILES = [
    os.path.join(WORKSPACE_ROOT, 'explore.md'),
    os.path.join(WORKSPACE_ROOT, 'found.md'),
    os.path.join(WORKSPACE_ROOT, 'running_notes.md'),
    os.path.join(WORKSPACE_ROOT, 'netic_definitions.md'),
    os.path.join(WORKSPACE_ROOT, 'hub.md'),
    os.path.join(WORKSPACE_ROOT, 'overview.md'),
    os.path.join(WORKSPACE_ROOT, 'dashboards.md'),
    os.path.join(WORKSPACE_ROOT, 'running notes.md'),
    os.path.join(WORKSPACE_ROOT, 'meeting notes feb 25.md'),
]

def load_state():
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE) as f:
                return json.load(f)
        except json.JSONDecodeError:
            return {'last_run': None, 'file_hashes': {}}
    return {'last_run': None, 'file_hashes': {}}

def save_state(state):
    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    with open(STATE_FILE, 'w') as f:
        json.dump(state, f, indent=2)

def file_hash(path):
    with open(path, 'rb') as f:
        return hashlib.md5(f.read()).hexdigest()

def main():
    state = load_state()
    changed_files = []
    summary_entries = []
    now = datetime.datetime.now(datetime.UTC)
    now_str = now.strftime('%Y-%m-%d %H:%M')

    for fp in INPUT_FILES:
        if not os.path.exists(fp):
            continue
        try:
            h = file_hash(fp)
        except Exception as e:
            print(f"Error hashing {fp}: {e}")
            continue
        prev_h = state['file_hashes'].get(fp)
        if prev_h != h:
            changed_files.append(fp)
            # Extract snippet: first two non-empty lines
            with open(fp) as f:
                lines = [line.strip() for line in f if line.strip()]
            snippet = lines[0] if lines else '(empty)'
            if len(lines) > 1:
                snippet += ' | ' + lines[1]
            summary_entries.append(f"- **{os.path.basename(fp)}**: {snippet}")
            state['file_hashes'][fp] = h

    # Append summary to output file
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'a') as out:
        out.write(f"\n## {now_str}\n")
        if summary_entries:
            out.write("### Changes detected in notes\n")
            out.write("\n".join(summary_entries) + "\n")
        else:
            out.write("No changes detected in monitored note files.\n")

    state['last_run'] = now.isoformat()
    save_state(state)
    print(f"[{now_str}] Summary {'appended' if summary_entries else 'no changes'} to {OUTPUT_FILE}")

if __name__ == '__main__':
    main()
