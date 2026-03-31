import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { Request, Response } from 'express';

const execAsync = promisify(exec);

interface TrinityRun {
  date: string;
  runId: string;
  status: string;
  durationMs: number;
  summary: string;
  memoryEntries: Array<{ text: string; category: string }>;
}

interface Stats {
  totalRuns: number;
  successCount: number;
  failureCount: number;
  avgDuration: number;
  memoryEntriesTotal: number;
}

export function registerTrinityEndpoint(app: any, workspaceRoot: string) {
  const cache = new Map<string, { data: any; timestamp: number }>();
  const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  app.get('/api/v1/trinity/runs', async (req: Request, res: Response) => {
    const cacheKey = '/api/v1/trinity/runs';
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json(cached.data);
    }

    try {
      // Find Trinity cron job ID
      const { stdout: cronListOut } = await execAsync('openclaw cron list --json');
      const cronList = JSON.parse(cronListOut);
      const trinityJob = cronList.jobs.find((j: any) => j.name === 'Trinity Overnight Cycle');
      if (!trinityJob) {
        return res.status(500).json({ error: 'Trinity cron job not found' });
      }
      const jobId = trinityJob.id;

      // Get recent runs
      const { stdout: runsOut } = await execAsync(`openclaw cron runs --id ${jobId} --limit 30`);
      const runsData = JSON.parse(runsOut);
      const runs = runsData.entries || [];

      // Collect unique dates to batch file reads
      const uniqueDates = new Set<string>();
      for (const run of runs) {
        const runDate = new Date(Number(run.runAtMs)).toISOString().split('T')[0];
        uniqueDates.add(runDate);
      }

      // For each unique date, read memory file once and count trinity entries
      const totalMemoryEntries = await countTrinityMemoryEntries(workspaceRoot, uniqueDates);

      // Build simplified runs without memoryEntries to reduce payload
      const simplifiedRuns: TrinityRun[] = runs.map((run: any) => ({
        date: new Date(Number(run.runAtMs)).toISOString().split('T')[0],
        runId: run.sessionId,
        status: run.status,
        durationMs: run.durationMs,
        summary: run.summary || '',
        memoryEntries: [], // Not needed in UI; keep empty for backward compatibility
      }));

      // Compute stats
      const totalRuns = simplifiedRuns.length;
      const successCount = simplifiedRuns.filter(r => r.status === 'ok').length;
      const failureCount = totalRuns - successCount;
      const avgDuration = totalRuns > 0
        ? Math.round(simplifiedRuns.reduce((sum, r) => sum + r.durationMs, 0) / totalRuns)
        : 0;

      const stats: Stats = {
        totalRuns,
        successCount,
        failureCount,
        avgDuration,
        memoryEntriesTotal: totalMemoryEntries,
      };

      const responseData = { runs: simplifiedRuns, stats };
      cache.set(cacheKey, { data: responseData, timestamp: Date.now() });
      res.json(responseData);
    } catch (err: any) {
      console.error('Error in /api/v1/trinity/runs:', err);
      res.status(500).json({ error: err.message });
    }
  });
}

async function countTrinityMemoryEntries(
  workspaceRoot: string,
  dates: Set<string>
): Promise<number> {
  let total = 0;

  for (const date of dates) {
    const memoryPath = join(workspaceRoot, 'memory', `${date}.md`);
    try {
      const content = await readFile(memoryPath, 'utf-8');
      const allEntries = parseMemoryDay(content);
      const trinityEntries = allEntries.filter(entry =>
        entry.text.toLowerCase().includes('trinity')
      );
      total += trinityEntries.length;
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        console.error(`Error reading memory file ${memoryPath}:`, err.message);
      }
      // If file doesn't exist, count stays unchanged
    }
  }

  return total;
}

function parseMemoryDay(content: string): Array<{ text: string; category: string }> {
  const entries: Array<{ text: string; category: string }> = [];
  const lines = content.split('\n');
  let currentCategory = 'general';

  for (const line of lines) {
    const sectionMatch = line.match(/^##\s+([^\n]+)/);
    if (sectionMatch) {
      currentCategory = sectionMatch[1].trim().toLowerCase();
      continue;
    }

    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('- [ ] ') || trimmed.startsWith('- [x] ')) {
      let text = trimmed;
      text = text.replace(/^-\s+\[[ x]\]\s+/, '- ');
      text = text.substring(2).trim();
      if (text) {
        entries.push({ text, category: currentCategory });
      }
    }
  }

  return entries;
}
