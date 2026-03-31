import { Request, Response } from 'express';
import { spawnSession } from '../sessions/openClawSession';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import os from 'os';

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || '/home/ubuntu/.openclaw/workspace';
const STATE_FILE = path.join(WORKSPACE_ROOT, '.openclaw', 'subagent-state.json');

interface SubagentState {
  deleted: Record<string, { action: string; timestamp: number }>;
  labels: Record<string, { label: string; description: string }>;
  statusHistory: Array<{ sessionKey: string; status: string; timestamp: number }>;
}

async function loadState(): Promise<SubagentState> {
  try {
    const content = await readFile(STATE_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return { deleted: {}, labels: {}, statusHistory: [] };
    }
    console.error('Failed to load subagent state:', err);
    return { deleted: {}, labels: {}, statusHistory: [] };
  }
}

async function saveState(state: SubagentState): Promise<void> {
  try {
    await writeFile(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    console.error('Failed to save subagent state:', err);
  }
}

function generateMockMetrics(seed: string, points: number = 30): Array<{ timestamp: string; cpu: number; memory: number }> {
  const metrics: Array<{ timestamp: string; cpu: number; memory: number }> = [];
  const now = Date.now();
  // Deterministic "random" based on seed string
  let value = 0;
  for (let i = 0; i < points; i++) {
    // Simple hash
    let h = 0;
    const combined = seed + i;
    for (let j = 0; j < combined.length; j++) {
      h = ((h << 5) - h) + combined.charCodeAt(j);
      h = h & h;
    }
    const rand = Math.abs(h) / 2147483647; // 0-1
    // CPU: mostly low (10-30%) with occasional spikes
    const baseCpu = 15 + Math.sin(i * 0.5) * 5;
    const spike = rand > 0.9 ? (rand - 0.9) * 100 : 0;
    const cpu = Math.max(1, Math.min(100, baseCpu + spike + (rand * 10 - 5)));
    // Memory: gradually increasing then reset
    const memBase = 128 + (i % 20) * 8 + rand * 32;
    const memory = Math.round(memBase);
    metrics.push({
      timestamp: new Date(now - (points - i) * 5000).toISOString(),
      cpu: Math.round(cpu * 10) / 10,
      memory,
    });
  }
  return metrics;
}

export function registerSubagentsEndpoint(app: any) {
  // Spawn a new subagent (existing)
  app.post('/api/v1/subagents/spawn', async (req: Request, res: Response) => {
    try {
      const { sessionKey, model } = req.body;
      if (typeof model !== 'string' || model.trim() === '') {
        return res.status(400).json({ error: 'Model is required' });
      }
      const key = await spawnSession(sessionKey, { model: model.trim() });
      res.json({ success: true, sessionKey: key });
    } catch (err: any) {
      console.error('Error in /api/v1/subagents/spawn:', err);
      res.status(400).json({ error: err.message });
    }
  });

  // Get resource metrics for a subagent (mock data)
  app.get('/api/v1/subagents/:sessionKey/metrics', async (req: Request, res: Response) => {
    try {
      const { sessionKey } = req.params;
      const metrics = generateMockMetrics(sessionKey, 30);
      const current = metrics[metrics.length - 1];
      res.json({ sessionKey, metrics, current });
    } catch (err: any) {
      console.error('Error in /api/v1/subagents/metrics:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Bulk actions: stop/kill/restart
  app.post('/api/v1/subagents/actions', async (req: Request, res: Response) => {
    try {
      const { sessionKeys, action } = req.body;
      if (!Array.isArray(sessionKeys) || sessionKeys.length === 0) {
        return res.status(400).json({ error: 'sessionKeys array required' });
      }
      if (!['stop', 'kill', 'restart'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action' });
      }

      const state = await loadState();
      const now = Date.now();
      const results: Array<{ key: string; success: boolean; error?: string; newKey?: string }> = [];

      for (const key of sessionKeys) {
        try {
          // For all actions, we mark as deleted (soft remove from list). Restart could spawn new but we keep simple.
          state.deleted[key] = { action, timestamp: now };
          results.push({ key, success: true });
          // Record status history
          state.statusHistory.push({ sessionKey: key, status: action === 'restart' ? 'restarted' : 'stopped', timestamp: now });
        } catch (e: any) {
          results.push({ key, success: false, error: e.message });
        }
      }

      await saveState(state);
      res.json({ success: true, results });
    } catch (err: any) {
      console.error('Error in /api/v1/subagents/actions:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get status history for a subagent
  app.get('/api/v1/subagents/:sessionKey/status-history', async (req: Request, res: Response) => {
    try {
      const { sessionKey } = req.params;
      const state = await loadState();
      const history = state.statusHistory
        .filter((h) => h.sessionKey === sessionKey)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10);
      res.json({ sessionKey, history });
    } catch (err: any) {
      console.error('Error in /api/v1/subagents/status-history:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Undo a bulk action: restore deleted sessions
  app.post('/api/v1/subagents/undo', async (req: Request, res: Response) => {
    try {
      const { sessionKeys } = req.body;
      if (!Array.isArray(sessionKeys) || sessionKeys.length === 0) {
        return res.status(400).json({ error: 'sessionKeys array required' });
      }
      const state = await loadState();
      for (const key of sessionKeys) {
        delete state.deleted[key];
      }
      await saveState(state);
      res.json({ success: true });
    } catch (err: any) {
      console.error('Error in /api/v1/subagents/undo:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Save label and description override for a subagent
  app.post('/api/v1/subagents/labels', async (req: Request, res: Response) => {
    try {
      const { sessionKey, label, description } = req.body;
      if (typeof sessionKey !== 'string' || typeof label !== 'string') {
        return res.status(400).json({ error: 'sessionKey and label are required' });
      }
      const state = await loadState();
      state.labels[sessionKey] = { label, description: description || '' };
      await saveState(state);
      res.json({ success: true });
    } catch (err: any) {
      console.error('Error in /api/v1/subagents/labels:', err);
      res.status(500).json({ error: err.message });
    }
  });
}
