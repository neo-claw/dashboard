# Netic Team-Opportunity Matcher (Trinity Build)

A tool to automatically match Netic team members with research opportunities and projects based on parsed expertise and interests.

## Data Sources
- `people.md` - Netic employee roster (engineering, operations, sales, design)
- `found.md` - Founders/engineers/designers list
- `netic_inbound.md` / `netic_definitions.md` - Netic inbound definitions and analytics
- `school_strat_uber_lyft.md`, `phil-running.md`, `runnig_notes_netic.md` - School/interest notes
- `running_notes.md`, `running_notes_phil.md` - General notes

## Matching Strategy
1. Extract person entities with roles and contact info
2. Parse each opportunity note to identify: 
   - Domain (AI/ML, engineering, design, operations, sales)
   - Required skills (keywords: python, react, infrastructure, marketing, etc.)
   - Interests (cognitive science, ant colony, Uber vs Lyft strategy, etc.)
   - Urgency/timeline (if deadlines present)
3. Compute matches using:
   - Role alignment (engineer->eng opportunity)
   - Interest keyword overlap (person's known interests vs opportunity topics)
   - Seniority hints (founder/lead vs junior)
4. Output markdown summary with top 3-5 matches per opportunity, including contact.

## CLI Usage
```bash
node match-opportunities.js [--dry-run]
```

## Next Enhancements
- Add embeddings for semantic matching (beyond keywords)
- Integrate with calendar availability
- Send email summaries via automation
- Learn from feedback to improve weights
