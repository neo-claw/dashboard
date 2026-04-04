import { proxyActivities, Workflow } from '@temporal/workflow';
import { FetchPendingParams, FetchPendingResult, ProcessBatchResult, RefreshInteractionsParams } from './types';

// Activities stub (would be implemented separately)
const activities = proxyActivities<{
  fetchPending(limit: number): Promise<FetchPendingResult>;
  recomputeInteraction(interactionId: string): Promise<boolean>;
  markCompleted(ids: string[], success: boolean): Promise<void>;
}>({
  startToCloseTimeout: '5 minutes',
});

/**
 * IncrementalRefreshWorkflow
 *
 * Periodically processes a batch of interactions that need refreshing due to
 * underlying data changes. Designed to replace full refresh of a large
 * materialized view (e.g., flattened_interaction).
 *
 * Execution:
 * - Can be triggered by a Temporal Schedule (e.g., every 5 minutes)
 * - Processes up to `batchSize` pending rows per run
 * - Logs metrics for observability
 */
export const IncrementalRefreshWorkflow = Workflow.define(
  'incremental-refresh',
  async (input: RefreshInteractionsParams) => {
    const { batchSize = 1000 } = input;

    // 1. Fetch a batch of pending interactions
    const pending: FetchPendingResult = await activities.fetchPending(batchSize);
    if (pending.ids.length === 0) {
      console.log('No pending interactions to refresh.');
      return { processed: 0, errors: 0 };
    }

    console.log(`Processing ${pending.ids.length} interactions...`);

    let processed = 0;
    let errors = 0;

    // 2. For each interaction, recompute its denormalized row
    for (const interactionId of pending.ids) {
      try {
        const ok = await activities.recomputeInteraction(interactionId);
        if (ok) {
          processed++;
        } else {
          errors++;
        }
      } catch (e) {
        console.error(`Failed to recompute interaction ${interactionId}:`, e);
        errors++;
      }
    }

    // 3. Mark batch as completed (or failed) in the tracking table
    await activities.markCompleted(pending.ids, true);

    console.log(`Completed batch: ${processed} succeeded, ${errors} failed.`);

    return { processed, errors };
  }
);

/**
 * Notes on recomputeInteraction:
 *
 * This activity would execute a deterministic query that mirrors the original
 * materialized view logic but scoped to a single interaction_id, e.g.:
 *
 *   INSERT INTO flattened_interaction AS fi
 *   SELECT ... FROM customer_interaction ci
 *   LEFT JOIN session_type_state sts ON ...
 *   WHERE ci.id = $1
 *   ON CONFLICT (interaction_id) DO UPDATE SET ...;
 *
 * The query should be idempotent and fast (< 1s per interaction). If needed,
 * we can cache subqueries or use upserts with RETURNING to minimize locking.
 */
