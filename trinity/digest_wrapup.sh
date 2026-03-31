#!/bin/bash
set -euo pipefail

cd /home/ubuntu/.openclaw/workspace
DATE=$(date +%Y-%m-%d)
LOG="trinity/$DATE.md"
DIGEST="TRINITY.md"

if [ -f "$LOG" ]; then
    echo "# Trinity Overnight Digest — $DATE" > "$DIGEST"
    echo "" >> "$DIGEST"
    cat "$LOG" >> "$DIGEST"
    # Only commit if there are changes
    if ! git diff --quiet "$DIGEST"; then
        git add "$DIGEST"
        git commit -m "Trinity digest $DATE $(date +%H:%M)" || true
        git push origin master || true
    fi
else
    echo "Daily log not found: $LOG" >&2
fi
