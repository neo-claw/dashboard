import requests, re, html, sys
from datetime import datetime

HEADERS = {'User-Agent': 'Mozilla/5.0 (compatible; TrinityBot/1.0)'}

URLS = [
    "https://mindcore.sas.upenn.edu/research/summer/",
    "https://cogsci.northwestern.edu/undergraduate/surf.html",
    "https://www.nsf.gov/funding/initiatives/reu",
    "https://cogsci.princeton.edu/funding/undergraduate-research-support",
    "https://www.simonsfoundation.org/funding-opportunities/shenoy-undergraduate-research-fellowship-in-neuroscience/surfin-program-lab-opportunities/"
]

def html_to_text(html_content):
    # remove script and style
    html_clean = re.sub(r'<(script|style).*?>.*?</\1>', '', html_content, flags=re.DOTALL|re.IGNORECASE)
    html_clean = re.sub(r'<!--.*?-->', '', html_clean, flags=re.DOTALL)
    # remove all tags
    text = re.sub(r'<[^>]+>', '', html_clean)
    # unescape html entities
    text = html.unescape(text)
    return text

def extract_dates(text):
    lines = text.split('\n')
    found = []
    deadline_keywords = ['deadline', 'due', 'application deadline', 'submit by', 'closing date', 'priority deadline']
    date_patterns = [
        r'\b(?:January|February|March|April|May|June|July|August|September|October|November|December)[,]?\s+\d{1,2}[,]?\s+\d{4}\b',
        r'\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)[,]?\s+\d{4}\b',
        r'\b\d{1,2}/\d{1,2}/\d{4}\b',
        r'\b\d{4}-\d{2}-\d{2}\b'
    ]
    for line in lines:
        low = line.lower()
        if any(kw in low for kw in deadline_keywords):
            for pat in date_patterns:
                m = re.search(pat, line, re.IGNORECASE)
                if m:
                    found.append(line.strip())
                    break
    return found

def extract_title(html_content):
    m = re.search(r'<title>(.*?)</title>', html_content, re.DOTALL|re.IGNORECASE)
    if m:
        title = m.group(1).strip()
        title = re.split(r'\s*\|\s*', title)[0].strip()
        return title
    return "Untitled"

def main():
    print("# Research Opportunities Aggregator\n")
    for url in URLS:
        try:
            resp = requests.get(url, headers=HEADERS, timeout=10)
            resp.raise_for_status()
            html_content = resp.text
            title = extract_title(html_content) or url
            text = html_to_text(html_content)
            # Clean up whitespace
            text = re.sub(r'\s+', ' ', text).strip()
            snippet = text[:500] + ('...' if len(text) > 500 else '')
            deadline_lines = extract_dates(text)
            deadline_info = ", ".join(sorted(set(deadline_lines))) if deadline_lines else "No explicit deadline found"
            print(f"## {title}\n")
            print(f"- **URL**: {url}")
            print(f"- **Deadline(s)**: {deadline_info}")
            print(f"- **Snippet**: {snippet}\n")
        except Exception as e:
            print(f"## Error fetching {url}\n- {e}\n")

if __name__ == '__main__':
    main()
