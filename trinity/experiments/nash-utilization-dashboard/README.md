# Nash Utilization Dashboard

Prototype for Hoffmann (Nash) utilization reporting with automated CSV export.

## Goal
- Show historical and forward-looking capacity utilization by tenant and business unit.
- Generate daily CSV export for Tinuiti (ads agency) to inform budget decisions.
- Eventually support rule-based budget adjustment automation.

## Structure
- `app.py` - Streamlit dashboard
- `data/` - sample data and data loading utilities
- `export.py` - CSV generation and email distribution
- `scheduler.py` - optional scheduler to run daily export

## Current state
Prototype only. Uses synthetic data.

## Next steps
- Connect to real data source (DB/API).
- Add automated email via SMTP (config in .env).
- Add cron/systemd timer for daily runs.
- Implement Google Ads API budget rules (future phase).