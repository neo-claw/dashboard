#!/usr/bin/env bash
# Research Picks Generator — numbered list, better spacing, TLDR

set -euo pipefail

WORKSPACE="${WORKSPACE:-/home/ubuntu/.openclaw/workspace}"
OUTPUT_DIR="${WORKSPACE}/research"
mkdir -p "$OUTPUT_DIR"

ARXIV_CATEGORIES=("cs.AI" "cs.LG" "cs.MA" "cs.SY")
DAYS_BACK=30
MAX_RESULTS=100
TOP_N=5

KEYWORDS=(
  "multi-agent" "agent" "orchestration" "swarm" "stigmergy"
  "event-driven" "streaming" "real-time" "pipeline"
  "distributed" "consensus" "coordination" "context"
  "memory" "knowledge graph" "retrieval" "episodic"
  "ant colony" "biological" "communication" "pheromone"
  "frontend" "evaluation" "visual" "diff" "testing"
  "analytics" "greenhouse" "netic" "crm" "dashboard"
  "reinforcement" "learning" "attention" "transformer" "residual"
)

# Build query
QUERY="cat:${ARXIV_CATEGORIES[0]}"
for i in "${!ARXIV_CATEGORIES[@]}"; do
  if [[ $i -gt 0 ]]; then QUERY="${QUERY}+OR+cat:${ARXIV_CATEGORIES[$i]}"; fi
done
QUERY="(${QUERY})"

echo "Fetching arXiv submissions..."
TMP_XML=$(mktemp)
curl -s --connect-timeout 10 --max-time 30 "https://export.arxiv.org/api/query?search_query=${QUERY}&start=0&max_results=${MAX_RESULTS}&sortBy=submittedDate&sortOrder=descending" -o "$TMP_XML" || { echo "❌ Fetch failed"; exit 1; }

# Parse entries robustly
awk '
BEGIN { RS="<entry>"; }
{
  title=""; id=""; published=""; summary=""; comment="";
  n = split($0, lines, "\n")
  for (i=1; i<=n; i++) {
    line = lines[i]
    if (line ~ /<title[^>]*>/) { sub(/.*<title[^>]*>/,"",line); sub(/<\/title>.*/,"",line); gsub(/[ \r\n]+/," ",line); title=line }
    if (line ~ /<id[^>]*>/) { sub(/.*<id[^>]*>/,"",line); sub(/<\/id>.*/,"",line); id=line }
    if (line ~ /<published>/) { sub(/.*<published>/,"",line); sub(/<\/published>.*/,"",line); published=line }
    if (line ~ /<summary[^>]*>/) { sub(/.*<summary[^>]*>/,"",line); sub(/<\/summary>.*/,"",line); gsub(/[ \r\n]+/," ",line); summary=line }
    if (line ~ /<arxiv:comment>/) { sub(/.*<arxiv:comment>/,"",line); sub(/<\/arxiv:comment>.*/,"",line); gsub(/[ \r\n]+/," ",line); comment=line }
  }
  if (title != "" && id != "" && published != "" && summary != "") {
    gsub(/\|/, "", title); gsub(/\|/, "", id); gsub(/\|/, "", published); gsub(/\|/, "", summary); gsub(/\|/, "", comment)
    print title "|" id "|" published "|" summary "|" comment
  }
}
' "$TMP_XML" > /tmp/arxiv_papers.txt
rm -f "$TMP_XML"

TOTAL=$(wc -l < /tmp/arxiv_papers.txt)
echo "Parsed $TOTAL papers. Scoring..."

# Score using awk
DAYS_BACK_VAR=$DAYS_BACK
KEYWORDS_VAR="${KEYWORDS[*]}"

awk -F'|' -v days_back="$DAYS_BACK_VAR" -v keywords="${KEYWORDS_VAR}" '
BEGIN {
  split(keywords, kw_arr, " ")
  theory_words["proof"]=1; theory_words["theorem"]=1; theory_words["lower bound"]=1; theory_words["upper bound"]=1; theory_words["complexity class"]=1; theory_words["hardness"]=1
  "date +%s" | getline now
}
{
  title=$1; id=$2; published=$3; summary=$4; comment=$5
  # pub_ms via date -d
  cmd = "date -d \"" published "\" +%s 2>/dev/null"
  cmd | getline pub_ms
  close(cmd)
  if (pub_ms == 0 || pub_ms == "") pub_ms = now - 86400*30
  age_days = int((now - pub_ms) / 86400)
  if (age_days < 0) age_days = 0
  recency_score = (days_back - age_days) / days_back
  if (recency_score < 0) recency_score = 0

  # Keyword match
  text_lc = tolower(title " " summary)
  kw_score = 0
  for (i in kw_arr) {
    kw = kw_arr[i]
    if (index(text_lc, kw) > 0) kw_score++
  }

  # Theory penalty
  theory_penalty = 0
  for (w in theory_words) {
    if (index(text_lc, w) > 0) theory_penalty += 0.5
  }

  # Composite
  kw_norm = kw_score / 3
  composite = 0.4*recency_score + 0.3*kw_norm - theory_penalty
  if (composite < 0) composite = 0

  # Extract pages from comment (e.g., "15 pages")
  pages = ""
  if (comment ~ /[0-9]+ pages/) {
    match(comment, /([0-9]+)[[:space:]]?pages?/, arr)
    if (arr[1] != "") pages = arr[1]"p"
  }

  printf "%.4f|%d|%d|%s|%s|%s|%s|%s|%s\n", composite, kw_score, age_days, id, title, published, summary, pages, comment
}
' /tmp/arxiv_papers.txt > /tmp/arxiv_scored.txt

# Filter and sort
awk -F'|' '$1 > 0.2 && $2 >= 1' /tmp/arxiv_scored.txt | sort -t'|' -k1,1nr > /tmp/arxiv_filtered_sorted.txt

# Generate digest
HEADER_COUNT=0
DIGEST_LINES=()
DIGEST_LINES+=("Research Picks")
DIGEST_LINES+=("")
DIGEST_LINES+=("")

NEW_TOPIC_CAND=""

while IFS='|' read -r composite kw_score age_days id title published summary pages comment; do
  if [[ $HEADER_COUNT -lt $TOP_N ]]; then
    idx=$((HEADER_COUNT+1))
    date_str="${published:0:10}"
    page_str="${pages}" ; [[ -z "$page_str" ]] && page_str="Length N/A"
    # Generate TLDR hook: take first ~120 chars of summary, lowercase first letter, ensure period
    hook=$(echo "$summary" | head -c 120 | sed 's/  */ /g')
    [[ ${#hook} -ge 120 ]] && hook="${hook}..."
    # Lowercase first char and ensure period
    hook="$(echo "${hook:0:1}" | tr '[:upper:]' '[:lower:]')${hook:1}"
    [[ "$hook" != *[.!?] ]] && hook="$hook."
    DIGEST_LINES+=("$idx. $title")
    DIGEST_LINES+=("Released $date_str • ${page_str}")
    DIGEST_LINES+=("TL;DR: $hook")
    DIGEST_LINES+=("")
    DIGEST_LINES+=("")
    DIGEST_LINES+=("")
    HEADER_COUNT=$((HEADER_COUNT+1))
  else
    # Candidate for new topic (low keyword overlap)
    if [[ $kw_score -le 1 ]] && [[ -z "$NEW_TOPIC_CAND" ]]; then
      NEW_TOPIC_CAND="$composite|$kw_score|$age_days|$id|$title|$published|$summary|$pages|$comment"
    fi
  fi
done < /tmp/arxiv_filtered_sorted.txt

# Horizon Expander (same style)
if [[ -n "$NEW_TOPIC_CAND" ]]; then
  IFS='|' read -r composite kw_score age_days id title published summary pages comment <<< "$NEW_TOPIC_CAND"
  date_str="${published:0:10}"
  page_str="${pages}" ; [[ -z "$page_str" ]] && page_str="Length N/A"
  hook=$(echo "$summary" | head -c 120 | sed 's/  */ /g')
  [[ ${#hook} -ge 120 ]] && hook="${hook}..."
  hook="$(echo "${hook:0:1}" | tr '[:upper:]' '[:lower:]')${hook:1}"
  [[ "$hook" != *[.!?] ]] && hook="$hook."
  DIGEST_LINES+=("")
  DIGEST_LINES+=("")
  DIGEST_LINES+=("")
  DIGEST_LINES+=("Horizon Expander")
  DIGEST_LINES+=("$title")
  DIGEST_LINES+=("Released $date_str • ${page_str}")
  DIGEST_LINES+=("TL;DR: $hook")
fi

OUTPUT=$(printf "%s\n" "${DIGEST_LINES[@]}")
echo "$OUTPUT"

DATE=$(date +%Y-%m-%d)
echo "$OUTPUT" > "$OUTPUT_DIR/picks-$DATE.md"
echo "✅ Research picks generated: $OUTPUT_DIR/picks-$DATE.md"
