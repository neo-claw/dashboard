#!/bin/bash
# Trinity daily summary generator
# Appends today's log to TRINITY.md under a date heading.

LOG_DIR="$HOME/.openclaw/workspace/trinity"
SUMMARY_FILE="$HOME/.openclaw/workspace/TRINITY.md"
TODAY=$(date +%Y-%m-%d)
LOG="$LOG_DIR/$TODAY.md"

if [ -f "$LOG" ]; then
  echo "## $TODAY" >> "$SUMMARY_FILE"
  cat "$LOG" >> "$SUMMARY_FILE"
  echo "" >> "$SUMMARY_FILE"
fi
