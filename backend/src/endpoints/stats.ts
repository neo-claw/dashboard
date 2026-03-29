import { exec } from 'child_process';
import { promisify } from 'util';
import { Request, Response } from 'express';
import { join } from 'path';
import { createCache } from '../cache/simpleCache';

const execAsync = promisify(exec);

const CACHE_TTL = 60_000; // 60 seconds
const statsCache = createCache<OverviewStats>(CACHE_TTL);

interface OverviewStats {
  learningsCount: number;
  trinityCyclesToday: number;
  kanbanTasks: { todo: number; inprogress: number; done: number };
  cronHealth: 'ok' | 'degraded' | 'down' | 'unknown';
  gatewayStatus: 'connected' | 'disconnected' | 'unknown';
  lastBrainCommit: string | null;
  gwsScansToday: number;
}

export function registerStatsEndpoint(app: any, workspaceRoot: string) {
  app.get('/api/v1/stats/overview', async (req: Request, res: Response) => {
    const cached = statsCache.get('stats');
    if (cached) {
      console.log('[stats] cache HIT');
      res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');
      return res.json(cached);
    }
    console.log('[stats] cache MISS');

    try {
      const stats: OverviewStats = {
        learningsCount: 0,
        trinityCyclesToday: 0,
        kanbanTasks: { todo: 0, inprogress: 0, done: 0 },
        cronHealth: 'unknown',
        gatewayStatus: 'unknown',
        lastBrainCommit: null,
        gwsScansToday: 0,
      };

      // Try to get learnings count
      try {
        const learningsResp = await fetchLearnings(workspaceRoot);
        stats.learningsCount = learningsResp.length;
      } catch (e: any) {
        console.warn('Could not fetch learnings count:', e);
      }

      // Try to get Trinity runs (today's cycles)
      try {
        const trinityResp = await fetchTrinityRuns(workspaceRoot);
        const today = new Date().toISOString().split('T')[0];
        const todayRuns = trinityResp.runs.filter((r: any) => r.date === today);
        stats.trinityCyclesToday = todayRuns.reduce((sum: number, r: any) => sum + r.cycles, 0);
      } catch (e: any) {
        console.warn('Could not fetch Trinity runs:', e);
      }

      // Try to get Kanban task counts
      try {
        const kanbanResp = await fetchKanbanTasks(workspaceRoot);
        stats.kanbanTasks = {
          todo: kanbanResp.todo.length,
          inprogress: kanbanResp.inprogress.length,
          done: kanbanResp.done.length,
        };
      } catch (e: any) {
        console.warn('Could not fetch Kanban tasks:', e);
      }

      // Cron health
      try {
        const { stdout } = await execAsync('openclaw cron status --json');
        const cronStatus = JSON.parse(stdout);
        const now = Date.now();
        const lastSuccess = cronStatus.lastSuccessMs || 0;
        const diffHours = (now - lastSuccess) / (1000 * 60 * 60);
        if (diffHours < 2) {
          stats.cronHealth = 'ok';
        } else if (diffHours < 6) {
          stats.cronHealth = 'degraded';
        } else {
          stats.cronHealth = 'down';
        }
      } catch (e: any) {
        stats.cronHealth = 'down';
      }

      // Gateway status
      try {
        const { stdout } = await execAsync('openclaw gateway status --json');
        const gwStatus = JSON.parse(stdout);
        stats.gatewayStatus = gwStatus.connected ? 'connected' : 'disconnected';
      } catch (e: any) {
        stats.gatewayStatus = 'unknown';
      }

      // Last brain commit (git)
      try {
        const gitDir = join(workspaceRoot, '.git');
        const { stdout } = await execAsync(`git --git-dir="${gitDir}" log -1 --format=%cd --date=iso`);
        stats.lastBrainCommit = stdout.trim();
      } catch (e: any) {
        stats.lastBrainCommit = null;
      }

      // GWS scans today (estimate from morning/evening digest runs in memory)
      try {
        const todayMemoryPath = join(workspaceRoot, 'memory', `${new Date().toISOString().split('T')[0]}.md`);
        const content = await execAsync(`cat "${todayMemoryPath}"`);
        const gwsMatches = content.stdout.match(/gws/g);
        stats.gwsScansToday = gwsMatches ? gwsMatches.length : 0;
      } catch (e: any) {
        stats.gwsScansToday = 0;
      }

      statsCache.set('stats', stats);
      res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');
      res.json(stats);
    } catch (err: any) {
      console.error('Error in /api/v1/stats/overview:', err);
      res.status(500).json({ error: err.message });
    }
  });
}

// Helper to fetch learnings via file read (reuse logic from learnings endpoint)
async function fetchLearnings(workspaceRoot: string): Promise<any[]> {
  const { readFile, readdir } = await import('fs/promises');
  const { join } = await import('path');
  const learnings = [];

  const learningsPath = join(workspaceRoot, 'LEARNINGS.md');
  try {
    const content = await readFile(learningsPath, 'utf-8');
    // Simple count: count bullet lines under date headers
    const lines = content.split('\n');
    let inSection = false;
    for (const line of lines) {
      if (line.match(/^##\s+\d{4}-\d{2}-\d{2}/)) {
        inSection = true;
        continue;
      }
      if (inSection && line.match(/^## /)) {
        inSection = false;
        break;
      }
      if (inSection && line.trim().startsWith('- ')) {
        learnings.push({ text: line.trim() });
      }
    }
  } catch (e: any) {
    if (e.code !== 'ENOENT') throw e;
  }

  // Count memory entries
  const memoryDir = join(workspaceRoot, 'memory');
  try {
    const files = await readdir(memoryDir);
    for (const file of files) {
      if (!file.match(/^\d{4}-\d{2}-\d{2}\.md$/)) continue;
      const filePath = join(memoryDir, file);
      const content = await readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.trim().startsWith('- ')) {
          learnings.push({ text: line.trim() });
        }
      }
    }
  } catch (e: any) {
    if (e.code !== 'ENOENT') throw e;
  }

  return learnings;
}

// Helper to fetch Trinity runs (reuse logic from trinity endpoint)
async function fetchTrinityRuns(workspaceRoot: string): Promise<any> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);
  const { join } = await import('path');
  const { readdir, readFile } = await import('fs/promises');

  const runs: any[] = [];
  const memoryDir = join(workspaceRoot, 'memory');

  try {
    const files = await readdir(memoryDir);
    const mdFiles = files.filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.md$/));

    for (const file of mdFiles) {
      const date = file.replace('.md', '');
      const filePath = join(memoryDir, file);
      const content = await readFile(filePath, 'utf-8');
      const stats = parseTrinityStats(content, date);
      if (stats) {
        runs.push(stats);
      }
    }
  } catch (e: any) {
    if (e.code !== 'ENOENT') throw e;
  }

  // Also read orchestrator log
  try {
    const logPath = join(workspaceRoot, '.progress', 'orchestrator.log');
    const logContent = await readFile(logPath, 'utf-8');
    const logRuns = parseOrchestratorLog(logContent);
    runs.push(...logRuns);
  } catch (e: any) {}

  runs.sort((a, b) => b.date.localeCompare(a.date));
  return { runs };
}

function parseTrinityStats(content: string, date: string): any | null {
  const lines = content.split('\n');
  let cycleCount = 0;
  let messageCount = 0;
  let firstTs: Date | null = null;
  let lastTs: Date | null = null;

  for (const line of lines) {
    if (line.includes('Trinity') || line.includes('🧠')) {
      messageCount++;
    }
    const timeMatch = line.match(/\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
    if (timeMatch) {
      const ts = new Date(timeMatch[1]);
      if (!firstTs) firstTs = ts;
      lastTs = ts;
    }
  }

  if (messageCount === 0) return null;

  const durationMs = (lastTs && firstTs) ? lastTs.getTime() - firstTs.getTime() : 0;
  return {
    date,
    cycles: Math.max(1, Math.floor(messageCount / 5)),
    durationMs,
    messages: messageCount,
    status: 'complete'
  };
}

function parseOrchestratorLog(content: string): any[] {
  const lines = content.split('\n');
  const runs: any[] = [];
  let currentDate: string | null = null;
  let cycleCount = 0;
  let startTime: Date | null = null;
  let endTime: Date | null = null;

  for (const line of lines) {
    const timeMatch = line.match(/\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})]/);
    if (timeMatch) {
      const timestamp = new Date(timeMatch[1]);
      const dateStr = timeMatch[1].split(' ')[0];

      if (currentDate !== dateStr) {
        if (currentDate && cycleCount > 0) {
          runs.push({
            date: currentDate,
            cycles: cycleCount,
            durationMs: endTime && startTime ? endTime.getTime() - startTime.getTime() : 0,
            messages: cycleCount * 10,
            status: 'complete'
          });
        }
        currentDate = dateStr;
        cycleCount = 0;
        startTime = timestamp;
      }
      endTime = timestamp;

      if (line.includes('Task') && line.includes('succeeded')) {
        cycleCount++;
      }
    }
  }

  if (currentDate && cycleCount > 0) {
    runs.push({
      date: currentDate,
      cycles: cycleCount,
      durationMs: endTime && startTime ? endTime.getTime() - startTime.getTime() : 0,
      messages: cycleCount * 10,
      status: 'complete'
    });
  }

  return runs;
}

// Helper to fetch Kanban tasks
async function fetchKanbanTasks(workspaceRoot: string): Promise<any> {
  const { readFile } = await import('fs/promises');
  const { join } = await import('path');
  const memoryPath = join(workspaceRoot, 'MEMORY.md');

  const todo: any[] = [];
  const inprogress: any[] = [];
  const done: any[] = [];

  try {
    const content = await readFile(memoryPath, 'utf-8');
    const lines = content.split('\n');
    let inProjects = false;

    for (const line of lines) {
      if (line.match(/^## Projects/i)) {
        inProjects = true;
        continue;
      }
      if (inProjects && line.match(/^## /)) {
        inProjects = false;
        break;
      }
      if (!inProjects) continue;

      const checkboxMatch = line.match(/^-\s+\[([ x])\]\s+(.+)$/);
      const bulletMatch = line.match(/^-\s+(.+)$/);

      if (checkboxMatch || bulletMatch) {
        const checked = checkboxMatch ? checkboxMatch[1] === 'x' : false;
        let title = checkboxMatch ? checkboxMatch[2] : bulletMatch![1];
        const tags: string[] = [];
        const tagMatch = title.match(/\[([^\]]+)\]/);
        if (tagMatch) {
          tags.push(tagMatch[1].toLowerCase());
          title = title.replace(/\[[^\]]+\]\s*/, '');
        }

        const task = { title: title.trim(), tags, priority: 'medium' as const };

        if (checked) {
          done.push(task);
        } else {
          todo.push(task);
        }
      }
    }
  } catch (e: any) {
    if (e.code !== 'ENOENT') throw e;
  }

  return { todo, inprogress, done };
}
