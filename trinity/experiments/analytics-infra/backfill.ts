#!/usr/bin/env node
/**
 * Backfill opportunity changes from version history.
 * Run: npx tsx backfill.ts
 *
 * Prerequisites:
 *   - DB connection configured via environment/db.ts
 *   - Table greenhouse.opportunity_change exists (schema.sql applied)
 *   - Table greenhouse.opportunity_version_history populated
 */

import { db } from '@/lib/db'; // adjust path as needed

const BACKFILL_SQL = `
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
  WHERE version > 1
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
    jsonb_build_object('version', version) AS metadata,
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
ON CONFLICT DO NOTHING;
`;

async function runBackfill() {
  console.time('backfill');
  try {
    const result = await db.raw(BACKFILL_SQL);
    console.log('Backfill complete.');
    console.log('Rows inserted/affected:', result);
  } catch (error) {
    console.error('Backfill failed:', error);
    process.exit(1);
  }
  console.timeEnd('backfill');
}

runBackfill();
