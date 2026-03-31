import { exec } from 'child_process';
import { promisify } from 'util';
import { Request, Response } from 'express';

const execAsync = promisify(exec);

// Simple in-memory cache for cron data
const cronCache = new Map<string, { data: any; expiresAt: number }>();
const RUNS_CACHE_TTL = 30_000; // 30 seconds
const JOBS_CACHE_TTL = 15_000; // 15 seconds

function getCached(key: string) {
  const entry = cronCache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cronCache.delete(key);
    return undefined;
  }
  return entry.data;
}

function setCached(key: string, data: any, ttl: number = 30_000) {
  cronCache.set(key, { data, expiresAt: Date.now() + ttl });
}

export function registerCronEndpoint(app: any, workspaceRoot: string) {
  /**
   * GET /api/v1/cron
   * List all cron jobs
   */
  app.get('/api/v1/cron', async (req: Request, res: Response) => {
    const cached = getCached('cron:jobs');
    if (cached) {
      res.set('Cache-Control', 'public, max-age=15, stale-while-revalidate=30');
      return res.json(cached);
    }

    try {
      const { stdout } = await execAsync('openclaw cron list --json');
      const data = JSON.parse(stdout);
      setCached('cron:jobs', data, JOBS_CACHE_TTL);
      res.set('Cache-Control', 'public, max-age=15, stale-while-revalidate=30');
      res.json(data);
    } catch (err: any) {
      console.error('Error listing cron jobs:', err);
      res.status(500).json({ error: 'Failed to list cron jobs', details: err.message });
    }
  });

  /**
   * GET /api/v1/cron/:id/runs?limit=30
   * Get run history for a specific cron job
   */
  app.get('/api/v1/cron/:id/runs', async (req: Request, res: Response) => {
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);
    const cacheKey = `cron:runs:${id}:${limit}`;

    const cached = getCached(cacheKey);
    if (cached) {
      res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
      return res.json(cached);
    }

    try {
      const { stdout } = await execAsync(`openclaw cron runs --id ${id} --limit ${limit}`);
      const data = JSON.parse(stdout);
      setCached(cacheKey, data, RUNS_CACHE_TTL);
      res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
      res.json(data);
    } catch (err: any) {
      console.error(`Error fetching runs for job ${id}:`, err);
      res.status(500).json({ error: 'Failed to fetch job runs', details: err.message });
    }
  });

  /**
   * POST /api/v1/cron/:id/run
   * Trigger a cron job to run now
   */
  app.post('/api/v1/cron/:id/run', async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      // Invalidate caches for this job's runs so fresh data is fetched next time
      cronCache.delete(`cron:runs:${id}:`);
      // Also invalidate jobs list to get updated state
      cronCache.delete('cron:jobs');

      const { stdout } = await execAsync(`openclaw cron run --id ${id}`);
      // The command output may be JSON or text. Try to parse as JSON if possible.
      let result: any = { success: true, output: stdout };
      try {
        result = JSON.parse(stdout);
      } catch {
        result = { success: true, message: stdout.trim() };
      }

      res.json(result);
    } catch (err: any) {
      console.error(`Error running job ${id}:`, err);
      res.status(500).json({ error: 'Failed to run job', details: err.message });
    }
  });

  /**
   * PATCH /api/v1/cron/:id
   * Update a cron job schedule (natural language or direct fields)
   * Body: { schedule?: string } where schedule is natural language like "every 15 min" or "at 3pm daily"
   */
  app.patch('/api/v1/cron/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { schedule } = req.body as any;

    if (!schedule) {
      return res.status(400).json({ error: 'schedule field is required' });
    }

    try {
      // Invalidate caches
      cronCache.delete('cron:jobs');

      // Parse natural language schedule into openclaw cron edit flags
      // Supports:
      // - "every N minutes" or "every N min" → --every Nm
      // - "every N hours" or "every N hour" → --every Nh
      // - "at HH:MM" (daily) → --cron "MM HH * * *"
      // - "every day at HH:MM" → --cron "MM HH * * *"
      // - raw cron expression if it contains * or looks like cron
      const normalized = schedule.toLowerCase().trim();
      let args: string[] = [];

      // Check for interval patterns
      const intervalMatch = normalized.match(/^every\s+(\d+)\s*(minute|min|hour|hr)s?$/);
      // Check for "at HH:MM" patterns
      const atTimeMatch = normalized.match(/^at\s+(\d{1,2})(?::(\d{2}))?\s*(daily)?$/);
      // Check for "every day at HH:MM"
      const everyDayAtMatch = normalized.match(/^every\s+day\s+at\s+(\d{1,2})(?::(\d{2}))?$/);

      if (intervalMatch) {
        const value = parseInt(intervalMatch[1]);
        const unit = intervalMatch[2].startsWith('min') ? 'm' : 'h';
        args = ['--every', `${value}${unit}`];
      } else if (atTimeMatch || everyDayAtMatch) {
        let hour = parseInt(atTimeMatch ? atTimeMatch[1] : everyDayAtMatch![1]);
        const minute = atTimeMatch && atTimeMatch[2] ? parseInt(atTimeMatch[2]) : (everyDayAtMatch && everyDayAtMatch[2] ? parseInt(everyDayAtMatch[2]) : 0);
        // Validate 24h format
        if (hour < 0 || hour > 23) throw new Error('Hour must be 0-23');
        if (minute < 0 || minute > 59) throw new Error('Minute must be 0-59');
        // Build cron expression: minute hour * * * (daily)
        const expr = `${minute} ${hour} * * *`;
        args = ['--cron', expr];
      } else {
        // Assume it's a raw cron expression or other openclaw edit flag
        // If it looks like a cron (has stars) or is in duration format like "10m" or "2h"
        if (normalized.includes('*') || /^\d+[mh]$/.test(normalized)) {
          // If it's just a duration like "10m", we need to use --every. The input might be "10m" not prefixed with "every"
          if (/^\d+[mh]$/.test(normalized)) {
            args = ['--every', normalized];
          } else {
            // Assume it's a cron expression
            args = ['--cron', normalized];
          }
        } else {
          return res.status(400).json({ error: 'Unsupported schedule format. Use "every N minutes/hours" or "at HH:MM" or a cron expression.' });
        }
      }

      // Execute: openclaw cron edit <id> <args...>
      const cmd = `openclaw cron edit ${id} ${args.join(' ')}`;
      const { stdout } = await execAsync(cmd);
      const result = { success: true, message: 'Schedule updated', command: cmd, output: stdout };
      res.json(result);
    } catch (err: any) {
      console.error(`Error updating job ${id}:`, err);
      res.status(500).json({ error: 'Failed to update schedule', details: err.message });
    }
  });
}
