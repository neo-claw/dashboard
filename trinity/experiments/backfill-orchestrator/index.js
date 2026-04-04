#!/usr/bin/env node

/**
 * Backfill Orchestrator
 *
 * Reads config YAML, connects to Postgres, and runs batched UPDATEs
 * to populate columns from JSONB fields or other expressions.
 *
 * Usage:
 *   DATABASE_URL=postgres://... node index.js --config config.yaml
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { Client } from 'pg';
import yaml from 'js-yaml';

const DEFAULT_CONFIG = 'config.yaml';

async function loadConfig(path) {
  try {
    const raw = await readFile(path, 'utf-8');
    return yaml.load(raw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error(`Config file not found: ${path}`);
      process.exit(1);
    }
    throw err;
  }
}

function buildStatePath(config) {
  return config.stateFile || '.backfill-state.json';
}

async function loadState(statePath) {
  try {
    const raw = await readFile(statePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return { lastId: null, processedCount: 0, completed: false };
    throw err;
  }
}

async function saveState(statePath, state) {
  await import('fs').then(fs => fs.writeFile(statePath, JSON.stringify(state, null, 2), 'utf-8'));
}

function buildCondition(columns, customWhere) {
  const nullChecks = Object.keys(columns).map(col => `${col} IS NULL`).join(' OR ');
  if (customWhere) {
    return `(${nullChecks}) AND (${customWhere})`;
  }
  return `(${nullChecks})`;
}

async function countTotal(client, table, condition) {
  const res = await client.query(`SELECT COUNT(*) AS total FROM ${table} WHERE ${condition}`);
  return parseInt(res.rows[0].total, 10);
}

async function getBatchIds(client, table, condition, lastId, batchSize) {
  const whereClause = lastId ? `${condition} AND id > $1` : condition;
  const params = lastId ? [lastId] : [];
  const order = lastId ? 'id ASC' : 'id ASC';
  const limit = `LIMIT $${params.length + 1}`;
  const query = `SELECT id FROM ${table} WHERE ${whereClause} ORDER BY ${order} ${limit}`;
  const values = [...params, batchSize];
  const res = await client.query({ text: query, values });
  return res.rows.map(r => r.id);
}

function buildUpdateSQL(table, idColumn, columns, batchIds) {
  const setClauses = Object.entries(columns).map(([col, src]) => `${col} = ${src}`).join(', ');
  // Build WHERE id IN (...) AND (some columns still NULL to avoid overwriting existing)
  const nullChecks = Object.keys(columns).map(col => `${col} IS NULL`).join(' OR ');
  const inClause = batchIds.map((_, i) => `$${i + 1}`).join(', ');
  const where = `${idColumn} IN (${inClause}) AND (${nullChecks})`;
  return `UPDATE ${table} SET ${setClauses} WHERE ${where}`;
}

async function run() {
  const [, , ...args] = process.argv;
  const configPath = args.find(a => a.startsWith('--config='))?.split('=')[1] || DEFAULT_CONFIG;
  const dryRun = args.includes('--dry-run') || args.includes('-n');

  const config = await loadConfig(configPath);
  const statePath = buildStatePath(config);
  let state = await loadState(statePath);

  if (state.completed) {
    console.log('Backfill already completed.');
    process.exit(0);
  }

  const { table, idColumn = 'id', batchSize = 1000, columns, where: customWhere } = config;
  if (!table || !columns) {
    console.error('Config must specify table and columns');
    process.exit(1);
  }

  const condition = buildCondition(columns, customWhere);

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // Compute total for progress if not stored
    if (state.totalCount === null) {
      console.log('Counting total rows to backfill...');
      state.totalCount = await countTotal(client, table, condition);
      console.log(`Total rows: ${state.totalCount}`);
    }

    while (true) {
      const batchIds = await getBatchIds(client, table, condition, state.lastId, batchSize);
      if (batchIds.length === 0) {
        console.log('No more rows to process.');
        state.completed = true;
        break;
      }

      const updateSQL = buildUpdateSQL(table, idColumn, columns, batchIds);
      if (dryRun) {
        console.log(`[DRY RUN] Would execute: ${updateSQL}`);
        console.log(`  with values: ${JSON.stringify(batchIds)}`);
      } else {
        console.log(`Executing batch of ${batchIds.length} rows (lastId=${state.lastId})...`);
        await client.query({ text: updateSQL, values: batchIds });
        console.log(`  Batch completed.`);
      }

      state.processedCount += batchIds.length;
      state.lastId = batchIds[batchIds.length - 1];
      await saveState(statePath, state);
      console.log(`Progress: ${state.processedCount}/${state.totalCount}`);
    }
  } catch (err) {
    console.error('Error during backfill:', err);
    process.exit(1);
  } finally {
    await client.end();
  }

  // Save final state
  await saveState(statePath, state);
  console.log('Backfill orchestrator finished.');
}

run().catch(console.error);