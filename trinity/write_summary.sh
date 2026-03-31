#!/bin/bash
# Trinity daily summary generator
# Appends yesterday's log to TRINITY.md under a date heading.

LOG_DIR="$HOME/.openclaw/workspace/trinity"
SUMMARY_FILE="$HOME/.openclaw/workspace/TRINITY.md"
YESTERDAY=$(date -d yesterday +%Y-%m-%d)
LOG="$LOG_DIR/$YESTERDAY.md"

if [ -f "$LOG" ]; then
  echo "## $YESTERDAY" >> "$SUMMARY_FILE"
  cat "$LOG" >> "$SUMMARY_FILE"
  echo "" >> "$SUMMARY_FILE"
fi
