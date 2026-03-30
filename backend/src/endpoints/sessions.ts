import { exec } from 'child_process';
import { promisify } from 'util';
import { Request, Response } from 'express';

const execAsync = promisify(exec);

interface SessionInfo {
  key: string;
  sessionId: string;
  agentId: string;
  active: boolean;
  lastHeartbeat: string;
  lastActivity: string;
  createdAt: string;
  metadata?: any;
}

export function registerSessionsEndpoint(app: any) {
  app.get('/api/v1/sessions/active', async (req: Request, res: Response) => {
    try {
      const { stdout } = await execAsync('openclaw sessions --json');
      const data = JSON.parse(stdout);
      const rawSessions = data.sessions || [];

      const sessions = rawSessions.map((s: any) => {
        const now = Date.now();
        const updated = new Date(s.updatedAt).getTime();
        const durationSec = Math.floor((now - updated) / 1000);
        return {
          key: s.key,
          sessionId: s.sessionId,
          agentId: s.agentId,
          active: updated > now - 5 * 60 * 1000, // active within 5 min
          lastHeartbeat: new Date(s.updatedAt).toISOString(),
          lastActivity: new Date(s.updatedAt).toISOString(),
          createdAt: new Date(updated - s.ageMs).toISOString(),
          durationSec,
          metadata: {
            model: s.model,
            kind: s.kind,
            inputTokens: s.inputTokens,
            outputTokens: s.outputTokens,
            totalTokens: s.totalTokens,
          },
        };
      });

      // Sort: active first, then by last activity
      sessions.sort((a: any, b: any) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
      });

      res.json({ sessions, count: sessions.length });
    } catch (err: any) {
      console.error('Error in /api/v1/sessions/active:', err);
      res.status(500).json({ error: err.message });
    }
  });
}
