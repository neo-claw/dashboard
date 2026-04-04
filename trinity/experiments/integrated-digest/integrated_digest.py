#!/usr/bin/env python3
"""
Integrated Digest + Task Extractor (Trinity)
Combines daily note fetching from Drive with automatic action item extraction.
"""

import os
import sys
import subprocess
from datetime import datetime
from pathlib import Path

# Path resolution: script is in trinity/experiments/integrated-digest/
# Workspace root is three levels up from experiments: .../workspace
WORKSPACE_ROOT = Path(__file__).parents[3].resolve()

def run_command(cmd, cwd=None, check=True):
    print(f"$ {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=cwd or WORKSPACE_ROOT, capture_output=True, text=True)
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)
    if check and result.returncode != 0:
        raise RuntimeError(f"Command failed: {' '.join(cmd)}")
    return result

def main():
    date_str = datetime.now().strftime('%Y-%m-%d')

    # Step 1: Run daily digest orchestrator
    print("=== Step 1: Fetching and consolidating daily digest ===")
    orchestrator_path = WORKSPACE_ROOT / 'trinity' / 'experiments' / 'daily-digest-orchestrator' / 'orchestrator.py'
    run_command(['python3', str(orchestrator_path)])

    # Determine paths
    orchestrator_dir = WORKSPACE_ROOT / 'trinity' / 'experiments' / 'daily-digest-orchestrator'
    sources_dir = orchestrator_dir / 'sources' / date_str
    # Digest is written to experiments/digests (sibling of orchestrator_dir)
    digest_dir = WORKSPACE_ROOT / 'trinity' / 'experiments' / 'digests'
    digest_path = digest_dir / f"{date_str}.md"

    if not digest_path.exists():
        raise FileNotFoundError(f"Digest not found: {digest_path}")

    print(f"📁 Digest: {digest_path}")
    print(f"📂 Sources: {sources_dir}")

    # Step 2: Run task extractor on sources
    print("\n=== Step 2: Extracting action items from sources ===")
    analyzer_dir = WORKSPACE_ROOT / 'trinity' / 'experiments' / 'auto-notes-analyzer'
    run_command(['node', 'extract-tasks.js', str(sources_dir)], cwd=analyzer_dir)

    # Step 3: Append summary to digest
    print("\n=== Step 3: Integrating summary into digest ===")
    summary_file = analyzer_dir / f"summary_{date_str}.md"
    if not summary_file.exists():
        raise FileNotFoundError(f"Summary not generated: {summary_file}")

    with open(digest_path, 'a', encoding='utf-8') as digest, open(summary_file, 'r', encoding='utf-8') as summary:
        digest.write("\n\n---\n\n")
        digest.write("## Extracted Tasks (Auto-Notes Analyzer)\n\n")
        digest.write(summary.read())

    print(f"✅ Integrated digest updated: {digest_path}")

    # Also copy summary to a shared location if needed
    # Could be placed in trinity/digests/ as separate but we already have it in digest.

    print("\n✨ Integrated digest complete. Tasks summary appended.")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)
