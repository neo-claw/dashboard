#!/usr/bin/env python3
"""
Morning Digest Summarizer for Trinity.
Takes the integrated daily digest (markdown) and tasks JSON,
produces a concise bullet-point summary for the morning digest.
"""

import os
import json
import re
import datetime
from pathlib import Path

WORKSPACE_ROOT = Path(__file__).parents[3].resolve()
DIGEST_DIR = WORKSPACE_ROOT / 'trinity' / 'experiments' / 'digests'
TASKS_DIR = WORKSPACE_ROOT / 'trinity' / 'experiments' / 'auto-notes-analyzer'
OUTPUT_DIR = DIGEST_DIR  # write alongside digest

def extract_section_lines(content, section_title):
    """Extract lines under a markdown heading (## or ###) matching section_title."""
    lines = content.split('\n')
    capture = False
    section = []
    for line in lines:
        if re.match(r'^#{2,3}\s+' + re.escape(section_title), line, re.IGNORECASE):
            capture = True
            continue
        if capture:
            if line.startswith('## ') or line.startswith('### '):
                break
            section.append(line)
    return section

def summarize_digest(date_str):
    digest_path = DIGEST_DIR / f"{date_str}.md"
    tasks_path = TASKS_DIR / f"tasks_{date_str}.json"

    if not digest_path.exists():
        raise FileNotFoundError(f"Digest not found: {digest_path}")

    digest = digest_path.read_text(encoding='utf-8')
    summary_lines = []

    # 1. Key Deadlines: Look for lines containing 'deadline' or dates in certain contexts
    # Also check for "Deadlines" section if present
    deadline_lines = []
    # Search for a "Deadlines" heading in the digest if any
    if 'Deadlines' in digest or 'deadline' in digest:
        # Grab around matches
        for i, line in enumerate(digest.split('\n')):
            if 'deadline' in line.lower() or re.search(r'\b(due|by)\b', line.lower()):
                # get a snippet
                snippet = line.strip()
                if snippet and len(snippet) > 10:
                    deadline_lines.append(snippet)
        # Limit to top 5
        if deadline_lines:
            summary_lines.append("**Deadlines & Due Dates**")
            for dl in deadline_lines[:5]:
                summary_lines.append(f"- {dl}")
            summary_lines.append("")

    # 2. High-Priority Tasks: from tasks JSON, filter by keywords like urgent, asap, important
    if tasks_path.exists():
        with open(tasks_path) as f:
            tasks = json.load(f)
        # Filter tasks with keywords
        urgent_keywords = ['urgent', 'asap', 'immediately', 'critical', 'important', 'priority', 'today', 'tomorrow']
        urgent_tasks = []
        for t in tasks:
            text = t['text'].lower()
            if any(kw in text for kw in urgent_keywords):
                urgent_tasks.append(t['text'])
        if urgent_tasks:
            summary_lines.append("**Urgent Tasks**")
            for ut in urgent_tasks[:5]:
                summary_lines.append(f"- {ut}")
            summary_lines.append("")

    # 3. New Opportunities / Interesting Findings: look for words like opportunity, fellowship, research, internship, call for
    opportunity_lines = []
    for line in digest.split('\n'):
        if any(word in line.lower() for word in ['opportunity', 'fellowship', 'research', 'internship', 'call for', 'grant', 'scholarship']):
            snippet = line.strip()
            if snippet and len(snippet) > 10:
                opportunity_lines.append(snippet)
    if opportunity_lines:
        summary_lines.append("**Opportunities & Research**")
        for ol in opportunity_lines[:5]:
            summary_lines.append(f"- {ol}")
        summary_lines.append("")

    # 4. Team Mention Highlights: names of people from people.md that appear in context of tasks
    # We could load people.md from notes_drive or from notes. For simplicity, scan for capitalized names? Not needed.

    # If nothing found, produce a generic note
    if not summary_lines:
        summary_lines.append("No urgent items flagged from today's digest.")
        summary_lines.append("")

    # Prepend date header
    header = f"## Morning Digest — {date_str}"
    output = header + "\n\n" + "\n".join(summary_lines)

    output_path = OUTPUT_DIR / f"morning_{date_str}.md"
    output_path.write_text(output, encoding='utf-8')
    print(f"✅ Morning digest summary written to {output_path}")
    return output_path

def main():
    date_str = datetime.datetime.now().strftime('%Y-%m-%d')
    summarize_digest(date_str)

if __name__ == "__main__":
    main()
