import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { stat } from 'fs/promises';
import { Request, Response } from 'express';
import { createCache } from '../cache/simpleCache';

const execAsync = promisify(exec);

const CACHE_TTL = 60_000; // 60 seconds
const healthCache = createCache<SystemHealth>(CACHE_TTL);

interface SystemHealth {
  gateway: {
    connected: boolean;
    uptime: number;
  };
  agents: Array<{
    id: string;
    name: string;
    status: 'online' | 'offline' | 'busy';
    lastSeen: string;
  }>;
  workspace: {
    sizeBytes: number;
    fileCount: number;
  };
}

export function registerHealthEndpoint(app: any, workspaceRoot: string) {
  app.get('/api/v1/system/health', async (req: Request, res: Response) => {
    const cached = healthCache.get('health');
    if (cached) {
      console.log('[health] cache HIT');
      res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');
      return res.json(cached);
    }
    console.log('[health] cache MISS');

    try {
      const health: SystemHealth = {
        gateway: {
          connected: false,
          uptime: 0,
        },
        agents: [],
        workspace: {
          sizeBytes: 0,
          fileCount: 0,
        },
      };

      // Gateway status
      try {
        const { stdout } = await execAsync('openclaw gateway status --json');
        const gwStatus = JSON.parse(stdout);
        health.gateway.connected = gwStatus.connected || false;
        health.gateway.uptime = gwStatus.uptime || 0;
      } catch (e) {
        health.gateway.connected = false;
      }

      // Agent list via sessions list
      try {
        const { stdout } = await execAsync('openclaw sessions list --json');
        const sessions = JSON.parse(stdout);
        health.agents = sessions.map((s: any) => ({
          id: s.key || s.sessionKey || 'unknown',
          name: s.agentId || s.name || 'agent',
          status: s.active ? 'online' : 'offline',
          lastSeen: s.lastActivity || s.lastHeartbeat || new Date().toISOString(),
        }));
      } catch (e) {
        health.agents = [];
      }

      // Workspace size
      try {
        const workspacePath = workspaceRoot;
        // Count files and total size (rough)
        const { stdout } = await execAsync(`find "${workspacePath}" -type f | wc -l`);
        health.workspace.fileCount = parseInt(stdout.trim()) || 0;
        const sizeOut = await execAsync(`du -sb "${workspacePath}"`);
        const sizeParts = sizeOut.stdout.trim().split('\t');
        health.workspace.sizeBytes = parseInt(sizeParts[0]) || 0;
      } catch (e) {
        health.workspace = { sizeBytes: 0, fileCount: 0 };
      }

      healthCache.set('health', health);
      res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');
      res.json(health);
    } catch (err: any) {
      console.error('Error in /api/v1/system/health:', err);
      res.status(500).json({ error: err.message });
    }
  });
}
