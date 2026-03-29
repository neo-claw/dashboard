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
  app.get('/api/v1/trinity/runs', async (req: Request, res: Response) => {
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

      // Enrich runs with memory entries from same date
      const enrichedRuns: TrinityRun[] = [];
      let totalMemoryEntries = 0;

      for (const run of runs) {
        const runDate = new Date(Number(run.runAtMs)).toISOString().split('T')[0];
        const memoryPath = join(workspaceRoot, 'memory', `${runDate}.md`);
        let memoryEntries: Array<{ text: string; category: string }> = [];

        try {
          const content = await readFile(memoryPath, 'utf-8');
          const allEntries = parseMemoryDay(content);
          memoryEntries = allEntries.filter(entry => 
            entry.text.toLowerCase().includes('trinity')
          );
          totalMemoryEntries += memoryEntries.length;
        } catch (err: any) {
          if (err.code !== 'ENOENT') {
            console.error(`Error reading memory file ${memoryPath}:`, err.message);
          }
        }

        enrichedRuns.push({
          date: runDate,
          runId: run.sessionId,
          status: run.status,
          durationMs: run.durationMs,
          summary: run.summary || '',
          memoryEntries,
        });
      }

      // Compute stats
      const totalRuns = enrichedRuns.length;
      const successCount = enrichedRuns.filter(r => r.status === 'ok').length;
      const failureCount = enrichedRuns.filter(r => r.status === 'error').length;
      const avgDuration = totalRuns > 0
        ? Math.round(enrichedRuns.reduce((sum, r) => sum + r.durationMs, 0) / totalRuns)
        : 0;

      const stats: Stats = {
        totalRuns,
        successCount,
        failureCount,
        avgDuration,
        memoryEntriesTotal: totalMemoryEntries,
      };

      res.json({ runs: enrichedRuns, stats });
    } catch (err: any) {
      console.error('Error in /api/v1/trinity/runs:', err);
      res.status(500).json({ error: err.message });
    }
  });
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
