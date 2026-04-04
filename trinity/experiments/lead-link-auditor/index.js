#!/usr/bin/env node

/**
 * Lead Link Auditor
 *
 * Checks Salesforce lead data for completeness of Account__c linkage
 * and generates a markdown report.
 *
 * Usage:
 *   DATABASE_URL=postgres://... node index.js [--output report.md]
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { Client } from 'pg';

async function run() {
  const [, , ...args] = process.argv;
  const outputPath = args.find(a => a.startsWith('--output='))?.split('=')[1] || `lead-link-report-${new Date().toISOString().slice(0,10)}.md`;

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    console.log('Fetching lead statistics...');
    // Total leads
    const totalRes = await client.query('SELECT COUNT(*) AS total FROM salesforce.lead');
    const total = parseInt(totalRes.rows[0].total, 10);

    // Leads with Account__c populated (in data JSONB)
    const linkedRes = await client.query(`SELECT COUNT(*) AS linked FROM salesforce.lead WHERE data->>'Account__c' IS NOT NULL`);
    const linked = parseInt(linkedRes.rows[0].linked, 10);

    // Leads with Account__c null
    const unlinked = total - linked;

    // Percentage
    const percent = total > 0 ? ((linked / total) * 100).toFixed(2) : '0.00';

    // Possibly also check leads with convertedAccountId? but simple version focuses on Account__c.

    const report = `# Salesforce Lead Link Audit

Generated: ${new Date().toISOString()}

## Summary

- Total Leads: ${total}
- Leads with Account__c linked: ${linked}
- Leads missing Account__c: ${unlinked}
- Linkage completeness: ${percent}%

## Implications

Only leads with a populated Account__c can be linked to ServiceAppointments (WorkOrders) via the Account bridge. Missing linkage means conversions from those leads cannot be attributed to campaigns.

## Suggested Action

Consider backfilling Account__c from other sources or enhancing lead capture to include the account relation.
`;

    await import('fs').then(fs => fs.writeFile(outputPath, report, 'utf-8'));
    console.log(`Report written to ${outputPath}`);
  } catch (err) {
    console.error('Error generating report:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run().catch(console.error);