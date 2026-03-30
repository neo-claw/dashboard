import { exec } from 'child_process';
import { promisify } from 'util';
import { Request, Response } from 'express';
import { createCache } from '../cache/simpleCache';

const execAsync = promisify(exec);

const CACHE_TTL = 5 * 60_000; // 5 minutes
const calendarCache = createCache<any[]>(CACHE_TTL, 50);

export function registerCalendarEndpoint(app: any) {
  app.get('/api/v1/calendar', async (req: Request, res: Response) => {
    const cached = calendarCache.get('events');
    if (cached) {
      res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
      return res.json({ events: cached });
    }

    try {
      // Build query parameters
      const calendarId = process.env.CALENDAR_ID || 'bonato@usc.edu';
      
      // Default to today onward (7 days range)
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const endDate = weekFromNow.toISOString().split('T')[0];
      
      // Also include a few days in the past for "today" filtering
      const past = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      const pastDate = past.toISOString().split('T')[0];

      // We'll fetch a broad range and let frontend filter
      const timeMin = `${pastDate}T00:00:00Z`;
      const timeMax = `${endDate}T23:59:59Z`;

      const params = JSON.stringify({
        calendarId,
        timeMin,
        timeMax,
        maxResults: 100,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const { stdout, stderr } = await execAsync(`gws calendar events list --params '${params}'`, {
        env: { ...process.env, GOOGLE_WORKSPACE_CLI_LOG: 'error' }
      });

      if (stderr && !stdout) {
        throw new Error(`gws command failed: ${stderr}`);
      }

      let data;
      try {
        data = JSON.parse(stdout);
      } catch (e) {
        console.error('Failed to parse gws output:', stdout);
        throw new Error('Invalid response from calendar service');
      }

      const events = data.items || [];

      // Cache the raw events
      calendarCache.set('events', events);
      
      res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
      res.json({ events });
    } catch (err: any) {
      console.error('Error in /api/v1/calendar:', err);
      res.status(500).json({ error: err.message });
    }
  });
}
