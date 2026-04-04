# Deadline Unification Engine

Extract deadlines from all notes (school, Netic, thoughts) into a single calendar view.

## Goal
- Scan markdown notes for date mentions near deadline cues ("due", "deadline", "by", etc.)
- Produce human-readable markdown report sorted by date
- Generate JSON for downstream automation (e.g., calendar sync, reminders)
- Run daily via cron as part of morning digest

## Usage

```bash
python3 extract_deadlines.py
```

Outputs:
- `upcoming_deadlines.md` — grouped by date, with source and context
- `deadlines_YYYY-MM-DD.json` — structured data including days until

## Implementation Notes

- Date parsing: supports ISO, US formats, and relative terms ("next Monday", "tomorrow", "in 3 days")
- Scans directories: `notes/`, `notes_drive/`, `notes_tmp/`, `trinity/notes/`
- Additionally includes key root notes: `running_notes.md`, `school_note.md`, `netic_note.md`, etc.
- Uses fuzzy matching; editable via DATE_PATTERNS and DEADLINE_CUES

## Next Steps

- Integrate with calendar (export .ics)
- Add email digest option
- Add confidence scoring to reduce false positives
- Support recurring deadlines (e.g., "every Monday")

## Utility

**Score: 9/10** — Directly prevents missed deadlines by centralizing scattered time commitments. Simple, language-agnostic, low maintenance.
