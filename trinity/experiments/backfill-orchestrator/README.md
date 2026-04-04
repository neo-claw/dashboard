# Backfill Orchestrator

A simple Node.js CLI for running large, idempotent backfills on Postgres tables with batching and progress persistence.

## Use Case

When you need to populate new columns based on existing data (e.g., flattening JSONB fields), this tool:
- Processes rows in configurable batches
- Tracks progress in a local state file
- Resumes where it left off after interruption
- Avoids overwriting already-populated columns
- Supports dry-run mode

## Setup

```bash
cd backfill-orchestrator
npm install
```

## Configuration

Copy `config.example.yaml` to `config.yaml` and edit:
- `table`: target table (e.g., `salesforce.lead`)
- `idColumn`: primary key column (default `id`)
- `batchSize`: rows per transaction
- `columns`: map of target column → SQL expression for new value
- `where` (optional): additional filter beyond the null checks
- `stateFile`: where to store progress
- `dryRun`: set true to preview SQL

## Run

```bash
DATABASE_URL=postgres://user:pass@host/db node index.js --config config.yaml
```

Add `--dry-run` to preview statements.

## Notes

- The tool only updates rows where target columns are currently NULL (safe).
- State file is updated after each successful batch; safe to stop anytime.
- Ensure the `idColumn` is indexed for performance.