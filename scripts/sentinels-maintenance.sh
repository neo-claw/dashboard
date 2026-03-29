#!/usr/bin/env bash
# Sentinel Maintenance Agent — Matrix-themed
# Hourly check for uncommitted/unpushed changes across all repos
# Usage: bash scripts/sentinels-maintenance.sh

set -euo pipefail

WORKSPACE="${WORKSPACE:-/home/ubuntu/.openclaw/workspace}"
REPORT="/tmp/sentinels-report-$(date +%Y%m%d-%H%M).txt"
EMAIL="${ALERT_EMAIL:-}"  # optional: send email if issues found

echo "=== Sentinel Maintenance Report ===" > "$REPORT"
echo "Generated: $(date -u)" >> "$REPORT"
echo "" >> "$REPORT"

# Find all git repositories
mapfile -t repos < <(find "$WORKSPACE" -type d -name .git -not -path "*/node_modules/*" | xargs -r dirname)

if [ ${#repos[@]} -eq 0 ]; then
  echo "No git repos found under $WORKSPACE" >> "$REPORT"
  exit 0
fi

issues_found=0

for repo in "${repos[@]}"; do
  echo "Checking: $repo" >> "$REPORT"
  cd "$repo"

  # Check for untracked files
  untracked=$(git status --porcelain | grep '^??' | wc -l)
  if [ "$untracked" -gt 0 ]; then
    echo "  ⚠️  $untracked untracked file(s):" >> "$REPORT"
    git status --porcelain | grep '^??' | sed 's/^??  /    - /' >> "$REPORT"
    issues_found=1
  fi

  # Check for unstaged changes
  unstaged=$(git status --porcelain | grep '^ M' | wc -l)
  if [ "$unstaged" -gt 0 ]; then
    echo "  ⚠️  $unstaged unstaged change(s):" >> "$REPORT"
    git status --porcelain | grep '^ M' | sed 's/^ M  /    - /' >> "$REPORT"
    issues_found=1
  fi

  # Check for staged but uncommitted
  staged=$(git status --porcelain | grep '^A\|^M\|^D\|^R' | wc -l)
  if [ "$staged" -gt 0 ]; then
    echo "  ⚠️  $staged staged but uncommitted change(s):" >> "$REPORT"
    git status --porcelain | grep '^A\|^M\|^D\|^R' | sed 's/^..  /    - /' >> "$REPORT"
    issues_found=1
  fi

  # Check if local branch is ahead of remote
  current_branch=$(git rev-parse --abbrev-ref HEAD)
  if git rev-parse --verify "origin/$current_branch" >/dev/null 2>&1; then
    ahead=$(git rev-list --count "HEAD..origin/$current_branch" 2>/dev/null || echo 0)
    behind=$(git rev-list --count "origin/$current_branch..HEAD" 2>/dev/null || echo 0)
    if [ "$behind" -gt 0 ]; then
      echo "  ⚠️  Local branch is behind remote by $behind commit(s)" >> "$REPORT"
      issues_found=1
    fi
    if [ "$ahead" -gt 0 ]; then
      echo "  ⚠️  Local branch is ahead of remote by $ahead commit(s) (unpushed)" >> "$REPORT"
      issues_found=1
    fi
  else
    echo "  ⚠️  Remote tracking branch 'origin/$current_branch' does not exist" >> "$REPORT"
    issues_found=1
  fi

  # Check for recent commits (last 24h) that haven't been pushed to any remote
  # Already covered by ahead check, but we also note new commits
  recent_commits=$(git log --since="24 hours ago" --oneline | wc -l)
  if [ "$recent_commits" -gt 0 ]; then
    echo "  ℹ️  $recent_commits commit(s) in last 24h" >> "$REPORT"
  fi

  echo "" >> "$REPORT"
done

# Summary
echo "=== Summary ===" >> "$REPORT"
if [ $issues_found -eq 0 ]; then
  echo "✅ All repositories are clean and in sync." >> "$REPORT"
else
  echo "❌ Issues detected. Review the report above." >> "$REPORT"
fi

# Print report to stdout
cat "$REPORT"

# Optionally send email alert
if [ $issues_found -eq 1 ] && [ -n "$EMAIL" ]; then
  mail -s "Sentinel Maintenance Alert $(hostname)" "$EMAIL" < "$REPORT" 2>/dev/null || true
fi

exit $issues_found
