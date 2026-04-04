# Utilization Pipeline

**Mission:** Automate the daily provision of utilization data to Netic's Hoffmann client and their agency Tinuiti, enabling data-driven ad budget adjustments.

## Context

Hoffmann requires:
- Historical capacity utilization (booked/available hours) per tenant and business unit
- Forward-looking (3/5/10 day) average utilization
- Daily CSV exports for manual ingestion by their ad agency

This pipeline provides:
- `data.json` for the Utilization Dashboard frontend
- Historical and forecast CSVs for stakeholder email/distribution
- Replaceable data source: currently reads from `data/utilization_data.csv`; can be upgraded to query BigQuery or other warehouse

## Structure

```
utilization_pipeline/
├── data/
│   └── utilization_data.csv   # Source data (replace with live extract)
├── exports/                   # Daily generated CSVs (gitignored)
│   ├── utilization_historical_YYYY-MM-DD.csv
│   └── utilization_forecast_YYYY-MM-DD.csv
├── update_dashboard.py        # Main script: generates data.json and exports
├── requirements.txt           # (Flask not needed; we use stdlib)
└── README.md
```

## Running

```bash
# Generate data.json and export CSVs
python3 update_dashboard.py
```

The script:
- Reads source CSV
- Writes `data.json` (used by dashboard frontend)
- Creates historical (last 30 days ending yesterday) and forecast (next 10 days) CSVs in `exports/`
- Also copies `data.json` to `../utilization_dashboard/` for live preview

## Cron

Set up a daily cron job (e.g., 06:00 UTC) to run:

```cron
0 6 * * * cd /path/to/trinity/experiments/utilization_pipeline && /usr/bin/python3 update_dashboard.py
```

## Future Enhancements

- Connect to BigQuery: replace `load_csv()` with a query to Netic's warehouse
- Email CSVs automatically to stakeholders (Tinuiti, internal). Add SMTP in `generate_daily_exports()`
- Add error monitoring/alerting (e.g., write logs to `exports/run.log` and alert on failure)
- Generate PDF summary if needed
- API endpoint (Flask) if interactive filtering beyond static data is required

## Utility

**Score: 9/10** – Solves a validated, high-value operational need with minimal complexity. Complements existing dashboard prototype without bloat.