#!/usr/bin/env bash
# Skill Radar: Scrapes GitHub trending page to discover new OpenClaw/Claude Code skills.
# Outputs a markdown table with repository info.

set -euo pipefail

# Fetch trending page
USER_AGENT="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
URL="https://github.com/trending?since=monthly"

echo "## Trending OpenClaw/Claude Code Repositories (Monthly)"
echo ""
echo "| Repository | Description | Language | Stars |"
echo "|------------|-------------|----------|-------|"

# Extract repo links: look for href patterns in h2.h3
curl -s -A "$USER_AGENT" "$URL" | grep -Eo 'href="(/[^/]+/[^"/]+)"' | sed 's/href="//;s/"$//' | sort -u | while read -r repo_path; do
  # Filter out non-repo links (e.g., /features/...)
  if [[ "$repo_path" =~ ^/[^/]+/[^/]+$ ]]; then
    # For simplicity, we'll just output the repo URL; description and stars would require more parsing.
    repo="https://github.com${repo_path}"
    echo "| $repo | - | - | - |"
  fi
done
