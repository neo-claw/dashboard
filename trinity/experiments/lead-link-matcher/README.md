# LeadLink Matcher

**Trinity Experiment — 2026-04-03**

A prototype tool to improve Salesforce data quality by automatically linking Leads to Appointments.

## Problem

Salesforce lead→appointment linkage is currently only 0.6%, meaning most leads are not associated with actual appointments. This severely limits analytics, attribution, and follow-up efficiency.

## Solution

LeadLink uses multi-key matching:
- **Phone** (normalized digits)
- **Email** (case-insensitive)
- **Name similarity** (Levenshtein-based, threshold 0.8)

It fetches leads and appointments from Salesforce (or uses demo data) and produces a report of potential links, reducing manual effort and increasing linkage completeness.

## Usage

### Demo mode

```bash
cd trinity/experiments/lead-link-matcher
npm install   # optional, no deps required for demo
node matcher.js --demo
```

Generates a markdown report and JSON with matches.

### Real mode

Set environment variables:

```bash
export SALESFORCE_INSTANCE_URL="https://company.my.salesforce.com"
export SALESFORCE_CLIENT_ID="..."
export SALESFORCE_CLIENT_SECRET="..."
# Optional custom SOQL queries
export SALESFORCE_LEAD_QUERY="SELECT Id, FirstName, LastName, Email, Phone FROM Lead"
export SALESFORCE_APPOINTMENT_QUERY="SELECT Id, ContactId, Contact.Name, Contact.Email, Contact.Phone FROM Appointment WHERE ContactId != null"
```

Then run:

```bash
node matcher.js
```

Note: Full Salesforce integration (OAuth, query) is not implemented in this prototype; it outlines the structure for future completion.

## Output

- `report_<timestamp>.md`: Human-readable summary.
- `matches_<timestamp>.json`: Machine-readable matches for upload or further processing.

## next steps

- Implement Salesforce REST API authentication and queries.
- Add fuzzy matching thresholds tuning.
- Add ability to generate Salesforce data loader CSV to update links.
- Add incremental sync and scheduling.

## Utility Score

Evaluated in Trinity overnight cycle (23:30):
- Problem Fit: 9
- Simplicity: 8
- Maintenance: 7
- Bloat: minimal
- **Utility Score: 9/10**