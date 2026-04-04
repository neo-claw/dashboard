/**
 * Demo: Query patterns for opportunity change history
 * Run: npx tsx demo-queries.ts
 *
 * Shows how to use the opportunity_change table for common dashboard needs.
 */

import { db } from '@/lib/db';

// Demo queries (non-executed here; these are patterns for later implementation)

const QUERY_PATTERNS = `
-- 1. Get stage transition durations for an opportunity (time in each stage)
SELECT
  opportunity_id,
  changed_at AS entered_at,
  LEAD(changed_at) OVER (PARTITION BY opportunity_id ORDER BY changed_at) AS exited_at,
  EXTRACT(EPOCH FROM (LEAD(changed_at) OVER (PARTITION BY opportunity_id ORDER BY changed_at) - changed_at)) AS duration_seconds,
  new_value AS stage_id
FROM greenhouse.opportunity_change
WHERE change_type = 'stage' AND opportunity_id = '${ oportunityId }'
ORDER BY changed_at;

-- 2. Count opportunities that closed (won) in a date range
SELECT
  DATE_TRUNC('day', changed_at) AS close_date,
  COUNT(*) AS closed_count
FROM greenhouse.opportunity_change oc
JOIN greenhouse.opportunity o ON o.id = oc.opportunity_id
WHERE oc.change_type = 'stage'
  AND oc.new_value = (SELECT id FROM greenhouse.opportunity_stage WHERE name = 'Closed' AND account_id = oc.account_id)
  AND o.status = 'won'
  AND oc.changed_at >= DATE '2026-04-01'
  AND oc.changed_at < DATE '2026-04-08'
GROUP BY DATE_TRUNC('day', changed_at)
ORDER BY close_date;

-- 3. Average time from "Proposal Sent" to "Closed Won" per BU (requires branch later)
-- For now, by pipeline
SELECT
  p.id AS pipeline_id,
  AVG(EXTRACT(EPOCH FROM (closed_at - proposal_sent_at))) / 86400 AS avg_days
FROM (
  SELECT
    opportunity_id,
    MAX(CASE WHEN new_value = 'proposal-sent-stage-id' THEN changed_at END) AS proposal_sent_at,
    MAX(CASE WHEN new_value = 'closed-won-stage-id' THEN changed_at END) AS closed_at
  FROM greenhouse.opportunity_change
  WHERE change_type = 'stage'
  GROUP BY opportunity_id
) s
JOIN greenhouse.opportunity o ON o.id = s.opportunity_id
JOIN greenhouse.opportunity_pipeline p ON p.id = o.pipeline_id
WHERE s.proposal_sent_at IS NOT NULL AND s.closed_at IS NOT NULL
GROUP BY p.id;

-- 4. Get daily snapshot of opportunities by stage (for capacity/utilization projection)
-- This will feed Hoffmann's forward-looking view: count of opportunities in "Booking" stage by day
SELECT
  DATE_TRUNC('day', changed_at) AS snapshot_date,
  new_value AS stage_id,
  COUNT(DISTINCT opportunity_id) AS opportunity_count
FROM greenhouse.opportunity_change
WHERE change_type = 'stage'
  AND changed_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', changed_at), new_value
ORDER BY snapshot_date DESC, stage_id;
`;

console.log('Opportunity Change Query Patterns:\n');
console.log(QUERY_PATTERNS);

// Example of fetching stage history for one opportunity
async function getStageHistory(opportunityId: string) {
  return db`
    SELECT
      changed_at,
      previous_value AS from_stage,
      new_value AS to_stage,
      changed_by,
      metadata
    FROM greenhouse.opportunity_change
    WHERE opportunity_id = ${opportunityId}
      AND change_type = 'stage'
    ORDER BY changed_at DESC
    LIMIT 50
  `;
}

// Note: These are patterns to be implemented after backfill completes.
// Next: build query helpers in repository layer for common dashboard needs.
