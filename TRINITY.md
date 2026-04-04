# Trinity Daily Summary — 2026-04-04

## Overnight Cycle (05:31 UTC)

**Goal:** Build tools that make Neo stronger; prioritize utility.

**Findings from User Notes (Google Drive):**
- Primary work log "runnig notes.md" reveals ongoing focus on analytics infrastructure, Temporal workflows, AI classifiers, and call diarization.
- Key pain points: diarization errors causing misclassification; `flattened_interaction` materialized view timeouts as data grows; manual classifier backfills and evaluation.

**Shortlist Evaluated:**
1. **Diarization Upgrade** (Utility 9): Replace Deepgram/Assembly with pyannote.audio 4.0 + custom post-processing to improve speaker separation and IVR/human detection.
2. **Incremental Refresh System** (Utility 10): Replace full materialized view refresh with change-tracking table `interactions_to_refresh` and Temporal-driven incremental updates. Addresses recurring timeout issue.
3. **Temporal Observability Dashboard** (Utility 8): Grafana/Prometheus integration for workflow health monitoring.

**Selected: Incremental Refresh (Highest Score)**

**PoC Built:** `trinity/experiments/incremental-refresh/`
- README with architecture and SQL snippets.
- Temporal workflow (`workflow.ts`) that processes pending refresh queue in batches.
- TypeScript types for inputs/outputs.
- Sample upsert query for single-interaction flattening.

**Next:**
- Review PoC with team; if approved, implement triggers on source tables and port full flattening logic.
- Continue monitoring and iterate on diarization improvements subsequently.
