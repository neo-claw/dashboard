# Netic Utilization Dashboard (Prototype)

**Mission:** Build a tool that provides historical and forward-looking capacity utilization visibility by tenant and business unit, with exportable reports for stakeholders and ad agencies.

## Problem Context (from user notes)

- Hoffmann (Netic customer) requires:
  1. Historical daily capacity utilization (booked/available) per tenant, per business unit.
  2. Forward-looking average utilization for next 3/5/10 days per tenant/business unit.
  3. Dashboard and exportable reports (CSV) that can be auto-generated and shared daily with internal stakeholders and agency partners (Tinuiti).
- Use case: Adjust Google Ads budgets based on utilization thresholds (e.g., >115% → reduce spend to 70%).
- Currently a manual process; they need an automated/streamlined view.

## Prototype

This folder contains a minimal, dependency-free prototype using vanilla HTML/CSS/JavaScript.

- `data.json`: Sample utilization data (mix of historical and forecast dates). In production, this would be generated from Netic's data warehouse (BigQuery or similar).
- `index.html`: Dashboard interface with:
  - Tabbed views: Historical and Forecast.
  - Filters: Tenant, Business Unit, date range.
  - Table display with sortable columns (by date).
  - Summary stats (record count, average utilization, over-capacity count).
  - CSV export button for current view.

### How to Run

1. Open `index.html` in a web browser (works offline).
2. Data is loaded from `data.json` via fetch. Ensure both files are in the same directory.

### CSV Export

Exports the currently filtered view to a CSV file named `utilization_<tab>_<today>.csv`. Columns: Date, Tenant, Business Unit, Utilization %, Booked Hours, Available Hours.

### Next Steps (towards production)

- Connect to real data source: build a backend endpoint (Node.js/Python) that queries BigQuery (or reads from Google Sheets) and returns JSON in the same schema.
- Add authentication/authorization if needed (internal use).
- Implement automated daily generation and emailing of CSV to Tinuiti and internal stakeholders.
- Add drill-down detail views (e.g., per job type).
- Add threshold-based alerts (e.g., highlight rows >115% in red).
- Deploy to internal hosting (e.g., Vercel, Netlify, or internal server).

## Design Principles

- Utility over bloat: uses plain HTML/JS, no frameworks.
- Easy to maintain and extend.
- Works offline with static files.
- CSV export is native browser functionality; no server required for prototype.

## Utility Score

9/10 – directly addresses a validated customer need with a simple, deployable solution.
