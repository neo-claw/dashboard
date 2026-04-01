# Skill Radar

A lightweight tool to discover trending OpenClaw and Claude Code skills on GitHub.

## Purpose

Keeping up with the rapidly evolving ecosystem of AI agent skills is challenging. Skill Radar automates the detection of new and popular repositories, helping identify useful tools and inspiration for building stronger systems.

## Usage

Run the script:

```bash
./trend-scraper.sh > trending_skills.md
```

The output is a markdown table listing repository URLs. For detailed information, visit each link.

## How It Works

- Fetches GitHub's trending page (`https://github.com/trending?since=monthly`).
- Extracts repository links using simple pattern matching.
- Filters to only include standard user/repo paths.
- Generates a markdown table.

## Improvements

Future versions could:
- Parse repository descriptions, language, and star counts from the HTML.
- Filter by topic (e.g., `openclaw`, `claude-code`, `ai-agents`).
- Cache results and track changes over time.
- Integrate with a skill registry for automatic installation.

## Notes

This is an experimental prototype. GitHub's HTML structure may change; adjust the extraction logic as needed.
