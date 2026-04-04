# Analytics Infrastructure — Gap #1: Generic Opportunity Change Store

## Why

The dashboard infrastructure (dashboards.md) lacks any way to track *when* an opportunity changed stages, statuses, or values. This blocks:
- Revenue filtering by close date
- Time-in-stage analytics
- Pipeline velocity reporting
- Capacity planning based on opportunity progression

Instead of building separate tables for each event type (`stage_transition`, `status_change`, etc.), we follow the "generic blob" approach recommended in dashboards.md: one flexible table `greenhouse.opportunity_change` that records any meaningful mutation.

## Schema

```sql
CREATE TABLE greenhouse.opportunity_change (
  id UUID PRIMARY KEY,
  opportunity_id UUID NOT NULL REFERENCES opportunity(id),
  account_id UUID NOT NULL,
  change_type VARCHAR(50) NOT NULL, -- 'stage'|'status'|'value'|'custom_field'|'other'
  changed_at TIMESTAMPTZ NOT NULL,
  changed_by UUID REFERENCES "user"(id),
  previous_value TEXT, -- JSON string or plain text
  new_value TEXT,      -- JSON string
  metadata JSONB       -- extra context: { pipeline_id, stage_id, field_key, version }
);
```

Indexes:
- `(opportunity_id, changed_at DESC)` for looking up an opportunity's history
- `(account_id, changed_at DESC)` for account-wide analytics
- `(change_type, account_id, changed_at)` for filtering by event type
- GIN index on `metadata` for flexible queries
- Partial index for stage transitions: `(opportunity_id, changed_at DESC) WHERE change_type = 'stage'`

## Components

1. **opportunity-change-handler.ts** - effect handler to emit events on opportunity updates
2. **backfill.ts** - one-time script to populate from `opportunity_version_history`
3. **schema.sql** - migration to create the table and indexes

## Integration Points

- Wire `handleOpportunityChange` into `OpportunityManagerService.updateOpportunity()` (or the appropriate mutation layer)
- In the same transaction/effect that updates the opportunity, capture the previous state and emit the change event
- For custom field changes, set `change_type = 'custom_field'` and `metadata.field_key = 'field_name'`

## Next Steps

After Gap #1 stable:
- Gap #2: Add `closed_at` and `close_status` to opportunity table to enable direct close date filtering
- Then integrate with Hoffmann utilization board queries to compute capacity windows

## Utility Score

- Problem Fit: 10/10 (blocks all time-based dashboards)
- Simplicity: 8/10 (single generic table, handlers)
- Maintenance: 9/10 (automatic, no cron)
- Bloat: 10/10 (no new frameworks, pure SQL/TS)
- **Overall: 9/10**
