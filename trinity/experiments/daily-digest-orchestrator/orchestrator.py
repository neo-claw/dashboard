#!/usr/bin/env python3
"""
Daily Digest Orchestrator (Trinity)
Fetches relevant note files from Google Drive using gws_wrapper,
consolidates into a daily markdown digest.
"""

import os
import sys
import json
import re
from datetime import datetime
from pathlib import Path

# Add gws_wrapper to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'gws_wrapper'))
from gws_wrapper import GWSWrapper

# Configuration: filename patterns to include (case-insensitive)
INCLUDE_PATTERNS = [
    r'thought', r'school', r'netic', r'running', r'people',
    r'inbound', r'phil', r'explore', r'found', r'hub',
    r'meeting', r'uber', r'lyft', r'strategy', r'strat',
    r'running_notes', r'call', r'agent', r'analytics'
]

MAX_FILES = 1000  # safety limit

def matches_pattern(name):
    name_lower = name.lower()
    return any(re.search(pat, name_lower) for pat in INCLUDE_PATTERNS)

def sanitize_filename(name):
    # Remove path traversal, keep alphanum and underscores
    return re.sub(r'[^a-zA-Z0-9_-]', '_', name)

def main():
    wrapper = GWSWrapper()
    print("Fetching file list from Drive...")
    files = wrapper.drive_list(page_size=MAX_FILES)
    print(f"Total files in Drive (cached): {len(files)}")

    # Filter relevant notes
    relevant = [f for f in files if matches_pattern(f['name'])]
    print(f"Relevant files found: {len(relevant)}")
    for f in relevant:
        print(f" - {f['name']} ({f['id']})")

    # Prepare output directories
    date_str = datetime.now().strftime('%Y-%m-%d')
    sources_dir = Path('sources') / date_str
    sources_dir.mkdir(parents=True, exist_ok=True)
    digests_dir = Path('..') / 'digests'
    digests_dir.mkdir(parents=True, exist_ok=True)

    # Fetch each file's content
    fetched_contents = []
    for file in relevant:
        file_id = file['id']
        name = file['name']
        mime = file['mimeType']
        # Determine output filename
        base_name = sanitize_filename(Path(name).stem)
        ext = Path(name).suffix if Path(name).suffix else '.md'
        # If it's a Google Docs, we'll export as markdown regardless of original
        if mime == 'application/vnd.google-apps.document':
            out_ext = '.md'
            export_mime = 'text/markdown'
        else:
            out_ext = ext or '.txt'
            export_mime = None
        out_filename = f"{base_name}_{file_id[-8:]}{out_ext}"
        out_path = sources_dir / out_filename

        try:
            if mime == 'application/vnd.google-apps.document':
                content_bytes = wrapper.drive_export(file_id, mime_type=export_mime)
            else:
                content_bytes = wrapper.drive_get(file_id)
            # Write file
            with open(out_path, 'wb') as f:
                f.write(content_bytes)
            text = content_bytes.decode('utf-8', errors='replace')
            fetched_contents.append({
                'name': name,
                'id': file_id,
                'content': text,
                'path': str(out_path)
            })
            print(f"✓ Fetched: {name} -> {out_path}")
        except Exception as e:
            print(f"✗ Failed to fetch {name} ({file_id}): {e}")

    # Generate consolidated digest
    digest_path = digests_dir / f"{date_str}.md"
    with open(digest_path, 'w', encoding='utf-8') as digest:
        digest.write(f"# Daily Digest - {date_str}\n\n")
        digest.write(f"**Generated:** {datetime.now().isoformat(timespec='minutes')}\n")
        digest.write(f"**Source files:** {len(fetched_contents)}\n\n")
        digest.write("---\n\n")
        for item in fetched_contents:
            digest.write(f"## {item['name']} (`{item['id'][-8:]}`)\n\n")
            digest.write(item['content'])
            digest.write("\n\n---\n\n")

    print(f"\n✅ Digest created: {digest_path}")
    print(f"📁 Sources stored in: {sources_dir}")

    # Optionally run task extractor? For now skip; can be separate step.
    print("💡 Next: run task extractor on sources if needed.")

if __name__ == "__main__":
    main()
