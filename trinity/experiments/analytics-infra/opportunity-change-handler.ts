/**
 * OpportunityChangeHandler
 *
 * Effect handler for generic opportunity change tracking.
 * Captures stage transitions, status changes, value updates, and custom field modifications.
 *
 * Integrates with the existing effect system (see TrackStageTimestampHandler example).
 * Stores changes in greenhouse.opportunity_change table.
 *
 * Design follows the "generic blob" recommendation from dashboards.md discussion (Thomaz).
 * This allows one table to capture many event types without proliferating narrow tables.
 */

import { db } from '@/lib/db'; // adjust import based on actual project structure
import { randomUUID } from 'crypto';

export interface OpportunityChangeMetadata {
  pipeline_id?: string;
  stage_id?: string;
  field_key?: string; // for custom field changes
  version?: number; // snapshot of opportunity version at change time
  [key: string]: any;
}

export interface OpportunityChangeInsert {
  opportunity_id: string;
  account_id: string;
  change_type: 'stage' | 'status' | 'value' | 'custom_field' | 'other';
  changed_at: Date;
  changed_by?: string;
  previous_value?: string; // JSON.stringify or plain text
  new_value?: string;
  metadata: OpportunityChangeMetadata;
}

/**
 * Main handler function - to be wired into effect system.
 * Example usage: await handleOpportunityChange({ opportunityId, accountId, changeType, ... })
 */
export async function handleOpportunityChange(event: OpportunityChangeInsert) {
  try {
    await db.greenhouse.opportunity_change.insert({
      id: randomUUID(),
      opportunity_id: event.opportunity_id,
      account_id: event.account_id,
      change_type: event.change_type,
      changed_at: event.changed_at,
      changed_by: event.changed_by,
      previous_value: event.previous_value,
      new_value: event.new_value,
      metadata: event.metadata,
      created_at: new Date(),
    });
  } catch (error) {
    // Never let analytics failures break core workflows.
    // Log to console/file but swallow error (or send to error monitoring).
    console.error('[OpportunityChangeHandler] Failed to record change:', error);
  }
}

/**
 * Helper: Build change event from opportunity version diff.
 * Call this after opportunity is updated (in the same transaction if possible).
 *
 * Example integration point: after OpportunityManagerService.updateOpportunity()
 */
export function buildChangeEvent(
  opportunity: any,
  previousState: any,
  changedBy?: string,
  changeType: OpportunityChangeInsert['change_type'] = 'other'
): OpportunityChangeInsert | null {
  if (!previousState) return null;

  const event: OpportunityChangeInsert = {
    opportunity_id: opportunity.id,
    account_id: opportunity.account_id,
    change_type: changeType,
    changed_at: new Date(),
    changed_by: changedBy,
    previous_value: undefined,
    new_value: undefined,
    metadata: {
      version: opportunity.version,
    },
  };

  // Customize extraction based on changeType
  switch (changeType) {
    case 'stage':
      event.previous_value = String(previousState.stage_id || '');
      event.new_value = String(opportunity.stage_id || '');
      event.metadata.stage_id = opportunity.stage_id;
      event.metadata.pipeline_id = opportunity.pipeline_id;
      break;
    case 'status':
      event.previous_value = String(previousState.status || '');
      event.new_value = String(opportunity.status || '');
      break;
    case 'value':
      event.previous_value = JSON.stringify(previousState.estimated_value ?? null);
      event.new_value = JSON.stringify(opportunity.estimated_value ?? null);
      break;
    case 'custom_field':
      // For custom field diffs, pass field_key in metadata externally
      event.previous_value = JSON.stringify(previousState.custom_fields ?? {});
      event.new_value = JSON.stringify(opportunity.custom_fields ?? {});
      break;
    default:
      event.previous_value = JSON.stringify(previousState);
      event.new_value = JSON.stringify(opportunity);
  }

  return event;
}

/**
 * Backfill utility: reconstruct change history from opportunity_version_history table.
 * This is a one-time script to populate the new event store with past transitions.
 *
 * SQL strategy:
 *   - Use LAG/LEAD window functions on versioned rows to detect changes in stage/status/value
 *   - Insert into opportunity_change with appropriate change_type
 *
 * This script should be run via a migration or standalone Node script.
 */
export const BACKFILL_SQL = `
WITH versioned AS (
  SELECT
    id AS opportunity_id,
    account_id,
    version,
    stage_id,
    status,
    estimated_value,
    custom_fields,
    changed_at,
    changed_by,
    LAG(stage_id) OVER (PARTITION BY id ORDER BY version) AS prev_stage,
    LAG(status) OVER (PARTITION BY id ORDER BY version) AS prev_status,
    LAG(estimated_value) OVER (PARTITION BY id ORDER BY version) AS prev_value
  FROM greenhouse.opportunity_version_history
  WHERE version > 1  -- skip initial creation
),
inserts AS (
  SELECT
    gen_random_uuid() AS id,
    opportunity_id,
    account_id,
    'stage' AS change_type,
    changed_at,
    changed_by,
    prev_stage::TEXT AS previous_value,
    stage_id::TEXT AS new_value,
    jsonb_build_object('version', version, 'pipeline_id', NULL) AS metadata,
    NOW() AS created_at
  FROM versioned
  WHERE prev_stage IS DISTINCT FROM stage_id

  UNION ALL

  SELECT
    gen_random_uuid(),
    opportunity_id,
    account_id,
    'status' AS change_type,
    changed_at,
    changed_by,
    prev_status::TEXT,
    status::TEXT,
    jsonb_build_object('version', version),
    NOW()
  FROM versioned
  WHERE prev_status IS DISTINCT FROM status

  UNION ALL

  SELECT
    gen_random_uuid(),
    opportunity_id,
    account_id,
    'value' AS change_type,
    changed_at,
    changed_by,
    prev_value::TEXT,
    estimated_value::TEXT,
    jsonb_build_object('version', version),
    NOW()
  FROM versioned
  WHERE prev_value IS DISTINCT FROM estimated_value
)
INSERT INTO greenhouse.opportunity_change (
  id, opportunity_id, account_id, change_type, changed_at, changed_by, previous_value, new_value, metadata, created_at
)
SELECT * FROM inserts
ON CONFLICT DO NOTHING; -- safety
`;
