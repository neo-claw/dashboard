# Calendar Exporter

Converts deadline JSON files from `deadline-tracker` into iCalendar (.ics) format.

## Quick Start

```bash
# From within calendar-exporter directory:
python3 export_calendar.py

# Or specify files:
python3 export_calendar.py /path/to/deadlines_2026-04-04.json output.ics
```

## Output

Creates `deadlines_YYYY-MM-DD.ics` in the same directory. Import this file into Google Calendar, Outlook, or any calendar app.

## Details

- All-day events on the deadline date
- Event UID includes date and index for stability
- Description includes source file and line number for traceability
- Proper iCalendar escaping for commas, semicolons, newlines

## Utility

**Score: 9/10** — Seamlessly integrates existing data with calendar workflows. No bloat, minimal maintenance.

## Next Steps

- Add optional time parsing if deadlines include times
- Support recurrence rules
- Add command-line flags to filter by days_until threshold
