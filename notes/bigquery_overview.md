# BigQuery Overview & Migration Context

## What BigQuery Is

BigQuery is a Google-managed data warehouse designed *only* for analytics. Unlike Postgres (which handles fast, small operations like "give me this record" or "update this row"), BigQuery is built for the opposite: scanning hundreds of millions of rows to produce aggregates.

**Key difference:** Postgres stores data in rows. BigQuery stores data in columns. This means for analytics queries (e.g. sum one column across 100M rows), BigQuery only reads that column — Postgres reads every full row. This makes BigQuery dramatically faster and cheaper for analytics workloads.

It's fully managed by Google — no servers to run. You pay per query based on data scanned.

---

## Why We Need It (The `refresh_flattened_interaction` Story)

The root problem: we've been using a transactional database (Postgres) as an analytics database. The seams are showing.

**The timeline:**
- Originally a materialized view refreshing every 7 minutes by scanning **95M+ rows** when only ~100 changed per day
- **24% of refreshes were timing out**
- Rewrote it 5+ times: watermarks, batch caps, lock splitting, PgBouncer compatibility
- Currently capped at 5,000 IDs per run with a self-healing mutex just to stay alive

This isn't a code quality problem — it's the wrong tool for the job. BigQuery solves this architecturally.

---

## The Target Architecture

```
[Postgres - app writes here]
       |
       | CDC (streams every change in real-time)
       ↓
[BigQuery - analytics live here]
       |              |              |
       ↓              ↓              ↓
  Dashboard      Scheduled      Write-back
  endpoints      queries        to Postgres
  (read BQ       (replace       (where app
  directly)      refresh_fi)    needs it)
```

---

## Key Concepts

### CDC (Change Data Capture)

Every database keeps a log of every change made to it (Postgres uses this for crash recovery). CDC tools tap into that log and stream it to BigQuery automatically.

Instead of `refresh_flattened_interaction` periodically asking "what changed since I last ran?", CDC forwards every insert/update/delete to BigQuery within seconds. The entire watermark/batch-cap/lock machinery goes away.

**Popular CDC tools:**

| Tool         | Type         | Notes                            |
| ------------ | ------------ | -------------------------------- |
| **Fivetran** | Managed/paid | Easiest setup, ~$500–2k/mo       |
| **Airbyte**  | Open source  | Self-hosted or cloud, free/cheap |
| **Debezium** | Open source  | DIY, plugs into Kafka            |

### Replacing `refresh_flattened_interaction`

The current function manually tracks watermarks, batches 5k IDs at a time, manages advisory locks, and handles crashes with a self-healing mutex.

In BigQuery: write a SQL view or scheduled query. BigQuery already has all the data via CDC. No incremental patching, no lock contention, no PgBouncer constraints. The 5-rewrite saga becomes a 20-line SQL file.

### Dashboard Endpoints

20+ endpoints in `/app/api/dashboard/analytics/` currently query Postgres directly via Kysely. Migrating means:
- Replace Kysely with the BigQuery client
- Queries stay mostly standard SQL
- Heavy aggregations that sometimes timeout now run in seconds

Migration doesn't have to be all at once — start with the heaviest/most painful endpoints (anything hitting `flattened_interaction`).

### BigQuery as a Trigger

BigQuery supports scheduled queries and can call Cloud Functions or Pub/Sub on completion. Useful for "after analytics run, fire an Inngest job" patterns.

### Write-Back to Postgres

If the app needs an analytics result back in Postgres (e.g. stamping a booking rate on an opportunity record), you can chain: BigQuery → Cloud Function → Postgres write. Less common but possible.

---

## Open Questions for the Team

1. Which CDC tool makes sense for our stack and budget?
2. Which dashboard endpoint do we migrate first? (Heaviest query = best ROI)
3. Run both systems in parallel during transition, or hard cut-over?
4. Do we need BigQuery → Postgres write-back, or can dashboards read BigQuery directly?

---

## One-Liners for the Meeting

- **The problem:** We've been using a transactional database as an analytics database, and the seams are showing.
- **BigQuery:** A Google-managed warehouse purpose-built for analytics — we'd feed it data via CDC and move dashboard queries there.
- **CDC:** A tool that watches Postgres and streams every change to BigQuery automatically, replacing the refresh function entirely.

## Big Query Meeting Notes
- google has cdc, will require us to restart the primary
	- investigate this just to make sure
- Postgres --> Datastream --> BigQuery
- Most of the work will be changing analytics endpoints
	- Write back into postgres or endpoint to BigQuery
	- Separate postgres instance so we dont blow up prod
- Any benefit to querying on bigquery itself?
	- no need to actually materialize, can slice and dice on anything
	- BQ Near real-time vs mat view in Postgres
- See latency and how easy it is to query endpoint off of BQ
- Making sure it actually aligns is the best
	- BigQuery you can run at any time, should always match analytics
- Alan looking into setup:
	- they just have a button
- Make sure we are NOT CDCing service titan
	- nvm shail said its not expensive at all (4c per gig, or 1.5c per gig)
	- Just rip them all
- Port query over fully
- Would be nice to have a snapshot of the data
	- Snapshot into a separate Postgres DB
- Aggregator to bigquery
- If temporal can do it all real-time, just rip the `task` and `classification` stuff real-time (I think hawk has this behind feature flag)
	- turn off v1 classifiers completely
- Make sure terraform links this up correctly here
	- Learn how to do this in terraform then TF apply, dont just do this in google with a button