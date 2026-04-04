# Lead Link Auditor

Generates a report on the completeness of the `Account__c` field in Salesforce leads.

## Purpose

For Netic's Salesforce integration, leads must have `Account__c` populated to link to work orders and measure campaign success. This tool quickly measures the linkage ratio and highlights the gap.

## Output

Markdown report with:
- Total leads count
- Number with Account__c
- Missing count and percentage

## Usage

```bash
DATABASE_URL=postgres://... node index.js [--output custom-report.md]
```

Requires a Postgres database with the `salesforce.lead` table where the Salesforce data is synced.