#!/usr/bin/env node
/**
 * overnight-summary.js
 * Aggregates Trinity logs, research picks, and recent notes into a morning digest.
 * Usage: node overnight-summary.js [date=YYYY-MM-DD (default: today)]
 */

import { readFile, readdir, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(__filename);

const WORKSPACE = process.env.WORKSPACE || '/home/ubuntu/.openclaw/workspace';

const PATHS = {
  trinityLogs: join(WORKSPACE, 'trinity'),
  research: join(WORKSPACE, 'research'),
  memory: join(WORKSPACE, 'memory')
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function pad(s) { return s.padStart(2, '0'); }
function formatDateFile(dateStr) {
  // dateStr = YYYY-MM-DD
  return `${dateStr}.md`;
}

async function ensureDir(p) {
  try {
    await mkdir(p, { recursive: true });
  } catch (e) {}
}

async function latestFile(dir, patternFn) {
  try {
    const files = await readdir(dir);
    const filtered = files.filter(patternFn);
    if (filtered.length === 0) return null;
    // Sort by name descending (date names)
    filtered.sort().reverse();
    return join(dir, filtered[0]);
  } catch (e) {
    return null;
  }
}

async function readTrinityLog(dateStr) {
  const filePath = join(PATHS.trinityLogs, formatDateFile(dateStr));
  try {
    const content = await readFile(filePath, 'utf8');
    return content;
  } catch (e) {
    return null;
  }
}

async function readResearchPicks(dateStr) {
  const filePath = join(PATHS.research, `picks-${dateStr}.md`);
  try {
    const content = await readFile(filePath, 'utf8');
    return content;
  } catch (e) {
    return null;
  }
}

async function readMemoryNotes(dateStr, lines = 10) {
  const filePath = join(PATHS.memory, formatDateFile(dateStr));
  try {
    const content = await readFile(filePath, 'utf8');
    const allLines = content.split('\n');
    const recent = allLines.slice(-lines).join('\n');
    return recent;
  } catch (e) {
    return null;
  }
}

function truncate(str, n) {
  if (!str) return '';
  if (str.length <= n) return str;
  return str.slice(0, n) + '...';
}

async function main() {
  const args = process.argv.slice(2);
  const dateArg = args.find(a => a.startsWith('date='));
  const targetDate = dateArg ? dateArg.split('=')[1] : todayStr();

  console.log(`\n=== Overnight Summary for ${targetDate} ===\n`);

  // Trinity log (direct from trinity/YYYY-MM-DD.md)
  const logContent = await readTrinityLog(targetDate);
  if (logContent) {
    console.log('[Trinity Log]');
    // Extract sections: each "## HH:MM" heading and following bullets
    const sections = logContent.split(/^## /m);
    // The first part before any heading may be empty or intro; skip
    const entries = sections.slice(1).slice(0, 5); // show up to 5 recent entries
    for (const sec of entries) {
      const lines = sec.split('\n').filter(l => l.trim() && !l.startsWith('#'));
      if (lines.length) {
        const heading = lines[0].trim();
        const bullets = lines.slice(1).filter(l => l.trim().startsWith('-') || l.trim().startsWith('*')).slice(0, 3);
        if (heading) console.log(`  ${heading}`);
        for (const b of bullets) {
          console.log(`    ${b}`);
        }
        console.log('');
      }
    }
  } else {
    console.log('[Trinity Log] No log found for this date.\n');
  }

  // Research picks
  const research = await readResearchPicks(targetDate);
  if (research) {
    console.log('[Research Picks]');
    const lines = research.split('\n').filter(l => l.trim() && !l.startsWith('#')).slice(0, 10);
    for (const l of lines) {
      console.log(`  ${l}`);
    }
    console.log('');
  } else {
    console.log('[Research Picks] No picks for this date.\n');
  }

  // Recent memory notes
  const memory = await readMemoryNotes(targetDate, 8);
  if (memory) {
    console.log('[Recent Notes]');
    const lines = memory.split('\n').filter(l => l.trim());
    for (const l of lines) {
      console.log(`  ${truncate(l, 80)}`);
    }
    console.log('');
  } else {
    console.log('[Recent Notes] No memory notes.\n');
  }

  console.log('=== End Summary ===\n');
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
