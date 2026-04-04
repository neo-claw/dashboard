-- Generic opportunity change event store
-- Captures any meaningful mutation to an opportunity: stage, status, value, custom fields, etc.
-- Part of analytics infra (Gap #1, dashboards.md)

CREATE TABLE IF NOT EXISTS greenhouse.opportunity_change (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES greenhouse.opportunity(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES "account"(id) ON DELETE CASCADE,
  change_type VARCHAR(50) NOT NULL, -- e.g., 'stage', 'status', 'value', 'custom_field'
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by UUID REFERENCES "user"(id), -- who triggered the change (if available)
  previous_value TEXT, -- JSON string of old value (or plain text for simple fields)
  new_value TEXT, -- JSON string of new value
  metadata JSONB, -- extra context: { pipeline_id, stage_id, field_key, version, etc. }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Indexes for common query patterns
  CONSTRAINT valid_change_type CHECK (change_type IN ('stage', 'status', 'value', 'custom_field', 'other'))
);

-- Composite indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_opportunity_change_opportunity_changed_at ON greenhouse.opportunity_change(opportunity_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_opportunity_change_account_changed_at ON greenhouse.opportunity_change(account_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_opportunity_change_type_account ON greenhouse.opportunity_change(change_type, account_id, changed_at);
CREATE INDEX IF NOT EXISTS idx_opportunity_change_metadata ON greenhouse.opportunity_change USING GIN(metadata);

-- Partial index for stage transitions (most common query)
CREATE INDEX IF NOT EXISTS idx_opportunity_change_stage ON greenhouse.opportunity_change(opportunity_id, changed_at DESC) WHERE change_type = 'stage';
