import { exec } from 'child_process';
import { promisify } from 'util';
import { Request, Response } from 'express';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);
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

export interface SessionInfo {
  key: string;
  sessionId: string;
  agentId: string;
  active: boolean;
  lastHeartbeat: string;
  lastActivity: string;
  createdAt: string;
  durationSec: number;
  metadata: {
    model: string;
    kind: string;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  label?: string; // optional label set at spawn
}

let sessionsCache: { data: any; timestamp: number } | null = null;
const CACHE_TTL_MS = 10 * 1000; // 10 seconds

export function registerSessionsEndpoint(app: any) {
  app.get('/api/v1/sessions/active', async (req: Request, res: Response) => {
    try {
      // Use cache if fresh
      const now = Date.now();
      if (sessionsCache && now - sessionsCache.timestamp < CACHE_TTL_MS) {
        return res.json(sessionsCache.data);
      }

      // Read sessions directly from the JSON file for speed and reliability.
      // The sessions file lives in OPENCLAW_HOME/agents/main/sessions/sessions.json.
      const openclawHome = process.env.OPENCLAW_HOME || path.join(WORKSPACE_ROOT, '..'); // fallback to sibling .openclaw
      const sessionsPath = path.join(openclawHome, 'agents', 'main', 'sessions', 'sessions.json');
      const content = await readFile(sessionsPath, 'utf-8');
      const data = JSON.parse(content);
      const rawSessions = data.sessions || [];

      const sessions = rawSessions.map((s: any) => {
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
          label: s.label, // include label if present
          metadata: {
            model: s.model,
            kind: s.kind,
            inputTokens: s.inputTokens,
            outputTokens: s.outputTokens,
            totalTokens: s.totalTokens,
          },
        };
      }) as SessionInfo[];

      // Load deleted state and filter out deleted subagents
      const state = await loadState();
      const filtered = sessions.filter(s => !state.deleted[s.key]);

      // Also attach label overrides from state (server-side)
      const enriched = filtered.map(s => ({
        ...s,
        labelOverride: state.labels[s.key]?.label,
        descriptionOverride: state.labels[s.key]?.description,
      }));

      // Sort: active first, then by last activity
      enriched.sort((a: any, b: any) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
      });

      const result = { sessions: enriched, count: enriched.length };
      // Update cache
      sessionsCache = { data: result, timestamp: Date.now() };
      res.json(result);
    } catch (err: any) {
      console.error('Error in /api/v1/sessions/active:', err);
      res.status(500).json({ error: err.message });
    }
  });
}
