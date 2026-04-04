# Incremental Refresh for `flattened_interaction`

## Problem

The materialized view `flattened_interaction` grew to ~95M rows and started timing out when refreshed every 7 minutes via `REFRESH MATERIALIZED VIEW CONCURRENTLY`. The full scan approach is unsustainable.

## Proposed Solution: Change-Tracking Table

Instead of full refresh, maintain a queue of interactions that need refreshing due to underlying data changes. Then incrementally update the denormalized table (or materialized view partitioned by interaction).

### Core Tables

```sql
-- Tracks which interactions need to be refreshed and why
CREATE TABLE interactions_to_refresh (
  id BIGSERIAL PRIMARY KEY,
  interaction_id UUID NOT NULL REFERENCES public.customer_interaction(id) ON DELETE CASCADE,
  due_to_col_update TEXT NOT NULL, -- column name or reason tag
  from_table TEXT NOT NULL, -- source table that changed
  refresh_status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, failed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optional: index for fast pending lookup
CREATE INDEX idx_interactions_to_refresh_pending ON interactions_to_refresh (refresh_status, created_at) WHERE refresh_status = 'pending';
```

### Change Capture

Add triggers on key tables (e.g., `customer_interaction`, `session_type_state`, `post_transfer_job`, etc.) that insert rows into `interactions_to_refresh` when relevant columns are updated. Example:

```sql
CREATE OR REPLACE FUNCTION track_interaction_refresh()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Determine which columns changed that affect flattened_interaction
    IF NEW.service_titan_job_id IS DISTINCT FROM OLD.service_titan_job_id THEN
      INSERT INTO interactions_to_refresh (interaction_id, due_to_col_update, from_table)
      VALUES (NEW.id, 'service_titan_job_id', TG_TABLE_NAME);
    END IF;
    -- ... other columns
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Incremental Refresh Workflow

A Temporal workflow runs periodically (e.g., every 5 minutes) to process pending rows in batches:

1. Fetch a batch of pending interactions (e.g., 1000).
2. For each interaction, recompute its flattened_interaction row by executing the deterministic logic from the original materialized view, but scoped to that interaction.
3. Upsert into `flattened_interaction` (or a regular table) with `ON CONFLICT (interaction_id) DO UPDATE`.
4. Mark corresponding `interactions_to_refresh` rows as `completed` (or `failed` with error).

This approach avoids full table scans and scales with the rate of data changes, not total data size.

## PoC Implementation

- `workflow.ts`: Temporal workflow that processes the refresh queue.
- `sample-query.sql`: Example of single-interaction flattening logic derived from the original view.

## Benefits

- Refresh time becomes proportional to changed interactions, not total rows.
- Concurrency can be tuned via batch size and parallelism.
- No need for heavyweight CDC or external data warehouse.
- Retains deterministic analytic output with lower staleness (can run more frequently).

##Next Steps

- Implement change triggers on all source tables.
- Port full flattening logic into a deterministic function per interaction.
- Add metrics and alerting on refresh queue backlog.
- Consider partitioning `flattened_interaction` by date for easier purge.
