name: recreation-check
description: Check Recreation.gov campsite availability with notifications via Telegram/email, state persistence, and dashboard integration.
argument-hint: '{"preset":"yosemite-valley","startDate":"2026-04-17","endDate":"2026-04-19"}'

# Recreation.gov Availability Checker (Enhanced)

This skill queries the Recreation.gov API to check campsite availability for one or more campgrounds within a given date range. It implements caching to detect new availability and only sends notifications when availability changes from the previous check. Includes heartbeat monitoring, multi-channel alerts, and a dashboard widget.

## Presets

- `yosemite-valley`: Upper Pines (232447), North Pines (232450), Lower Pines (232448).
- `yosemite-all`: All 5 major Yosemite Valley area campgrounds (+ Yosemite Creek 232449, Camp 4 232446). Use with caution due to increased API load.

## Workflow

### Parameters

Read JSON from stdin. Expected:

- `startDate` (string, required): Start date in `YYYY-MM-DD` format.
- `endDate` (string, required): End date in `YYYY-MM-DD` format.
- One of:
  - `preset` (string): Named preset.
  - `campgroundIds` (array of integers): List of campground IDs.
  - `campgroundId` (integer): Single ID (legacy).

### API Queries

- URL: `https://www.recreation.gov/api/camps/availability/campground/{campgroundId}/month?start_date={encoded_date}`
- Use curl with User-Agent `OpenClaw-Recreation-Checker/1.0`.
- For date ranges spanning multiple months, query each month separately (first day of month at 00:00 UTC).
- **Politeness**:
  - 2-second delay between month queries for the same campground.
  - 1-second delay between different campgrounds.
- Retry: Up to 3 attempts per month with exponential backoff (1s, 2s, 4s). If a campground fails all retries, log and continue with others.

### Available Site Determination

A campsite is considered available if any date in the requested range has:
- `availabilities[date] == "Available"` OR
- `quantities[date] > 0`.

Collects: `campsite_id`, `site`, `loop`, `campsite_type`, `campground_id`, `campground_name`, and the specific available dates (ISO format).

### Caching (Deduplication)

Cache file: `~/.openclaw/workspace/cache/recreation-check-last-result.json`

Compare current result with cache:
- If campground ID set differs → change.
- Else if set of `(campsite_id, campground_id, tuple(sorted(available_dates)))` differs → change.
- If identical → no change, exit quietly.

Always write current result to cache (overwrite).

### Output

Human-readable summary to stdout:
- If found: "Found N available site(s) from START to END across monitored campgrounds:" followed by grouped sites with dates.
- If none: "No campsites available..."

Exit code 0 unless all campgrounds failed (some errors).

### Notifications (when availability changes and sites found)

1. **Log file**: Append to `~/.openclaw/workspace/logs/recreation-check-notifications.log`.
2. **Telegram**: If `OPENCLAW_TELEGRAM_BOT_TOKEN` set, send to `OPENCLAW_TELEGRAM_CHAT_ID` (fallback `8755267864`). Message includes count, date range, breakdown per campground (max 10 sites each), and **direct booking links** (`https://www.recreation.gov/camping/campsites/{siteId}?arrive=YYYY-MM-DD&depart=YYYY-MM-DD`).
3. **Email**: If SMTP configured (`OPENCLAW_SMTP_HOST`, `OPENCLAW_SMTP_PORT` (default 587), `OPENCLAW_SMTP_USER`, `OPENCLAW_SMTP_PASS`, and optionally `OPENCLAW_EMAIL_FROM`, `OPENCLAW_EMAIL_TO`), send an email with the same content.

### Heartbeat

On each run (regardless of availability), write a heartbeat file: `~/.openclaw/workspace/cache/recreation-check-heartbeat.json` with:
```json
{
  "last_run": "2026-04-02T17:00:00Z",
  "success": true
}
```
If the script exits with errors, `success` is `false`.

A separate monitor script (`heartbeat-monitor.py`) can be scheduled (e.g., every 5 minutes) to alert via Telegram/Email if the last successful run is older than 15 minutes or if the last run failed.

### Scheduling

Recommended: Every 2 minutes via cron:
```
*/2 * * * * /home/ubuntu/.openclaw/extensions/compound-engineering/skills/recreation-check/check >/dev/null 2>&1
```

Monitor (optional):
```
*/5 * * * * /home/ubuntu/.openclaw/extensions/compound-engineering/skills/recreation-check/heartbeat-monitor.py >> /home/ubuntu/.openclaw/workspace/logs/heartbeat-monitor.log 2>&1
```

## Dashboard Integration

A widget is available at `app/components/RecreationCheckWidget.tsx` that displays:
- Number of monitored campgrounds
- Current availability count (highlighted if >0)
- Last check timestamp and age
- Date range

The widget fetches from the API endpoint `GET /api/recreation-check/status` every 30 seconds. Add it to the Overview page.

### API Endpoint

`GET /api/recreation-check/status` returns:
```json
{
  "hasCache": true,
  "status": "fresh|stale|old",
  "lastCheck": "2026-04-02T17:00:00Z",
  "ageMinutes": 2.3,
  "campgroundIds": ["232447"],
  "campgroundNames": {"232447":"Upper Pines"},
  "startDate": "2026-04-17",
  "endDate": "2026-04-19",
  "hadAvailability": false,
  "availableSitesCount": 0
}
```

## Environment Variables

- `OPENCLAW_TELEGRAM_BOT_TOKEN` (required for Telegram)
- `OPENCLAW_TELEGRAM_CHAT_ID` (optional, defaults to 8755267864)
- `OPENCLAW_SMTP_HOST` (optional, for email)
- `OPENCLAW_SMTP_PORT` (optional, default 587)
- `OPENCLAW_SMTP_USER` (optional)
- `OPENCLAW_SMTP_PASS` (optional)
- `OPENCLAW_EMAIL_FROM` (optional, defaults to SMTP_USER)
- `OPENCLAW_EMAIL_TO` (optional, defaults to EMAIL_FROM)

All logs are written to `~/.openclaw/workspace/logs/`.

## Notes

- The script is idempotent: running multiple times with same parameters doesn't spam notifications because of cache comparison.
- Rate limiting is enforced by delays; be mindful when adding many campgrounds. Use the `yosemite-all` preset only if your cron interval is sufficiently long (>=2 minutes).
- Booking links are prefilled with the requested dates and specific campsite ID, allowing quick reservation on Recreation.gov.
