# Yosemite Campground Monitor (Improved)

Uses the official Recreation Information Database (RIDB) API instead of web scraping.

**Benefits:**
- Reliable, stable API
- Correct facility IDs (Upper Pines 232447, Lower Pines 232450, North Pines 232449)
- No fragile scraping of recreation.gov
- Clear, structured reports

## Setup

1. Get an API key from https://ridb.recreation.gov/signup
2. Save it to `~/.config/ridb_api_key` OR set `RIDB_API_KEY` environment variable
3. Ensure `requests` library is installed: `pip install requests`

## Usage

```bash
cd ~/.openclaw/workspace/trinity/experiments/recreation-gov-improved
python3 check_yosemite_availability.py [options]
```

**Options:**
- `--start YYYY-MM-DD` (default: 7 days from now)
- `--end YYYY-MM-DD` (default: start+2 days)
- `--facilities` (comma-separated list, default: 232447,232450,232449)
- `--output FILE` (default: yosemite_availability_report_latest.md)

## Cron Integration

Replace the old recreation-gov-campsite-checker cron job with:

```bash
0 8,20 * * * cd /home/ubuntu/.openclaw/workspace/trinity/experiments/recreation-gov-improved && /usr/bin/python3 check_yosemite_availability.py >> /var/log/trinity_yosemite_cron.log 2>&1
```

## Notes

- Excludes Tuolumne Meadows (232448) which is not in Yosemite Valley and seasonally closed in April.
- If facility IDs change, the script will display validation warnings during each run.
- Report format is markdown; includes list of available sites or sold-out status.
