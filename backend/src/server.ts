import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';
import { WebSocket } from 'ws';
import os from 'os';
import { activityBroadcaster } from './activity-broadcaster';
import { toolRegistry } from './lib/toolRegistry';

dotenv.config();

const execAsync = promisify(exec);

const app = express();
const PORT = process.env.PORT || 3001;
const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || '/home/ubuntu/.openclaw/workspace';
const BACKEND_API_KEY = process.env.BACKEND_API_KEY;
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${PORT}`;

// Middleware
app.use(cors());
app.use(helmet());
app.use(rateLimit({ windowMs: 60_000, max: 100 }));
app.use(express.json());

// Auth
function authenticate(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${BACKEND_API_KEY}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Cache (simple in-memory)
class SimpleCache<V> {
  entries: Map<string, { value: V; expiresAt: number }> = new Map();
  constructor(private ttlMs: number = 300_000, private capacity: number = 10) {}
  get(key: string): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.entries.delete(key);
      return undefined;
    }
    // Refresh LRU
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }
  set(key: string, value: V) {
    if (this.entries.size >= this.capacity) {
      const first = this.entries.keys().next().value;
      if (first !== undefined) this.entries.delete(first);
    }
    this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }
}

const learningsCache = new SimpleCache<any[]>(300_000);
const statsCache = new SimpleCache<any>(300_000);
const healthCache = new SimpleCache<any>(300_000);

// Endpoints registration
import { registerLearningsEndpoint } from './endpoints/learnings';
import { registerTrinityEndpoint } from './endpoints/trinity';
import { registerKanbanEndpoint } from './endpoints/kanban';
import { registerStatsEndpoint } from './endpoints/stats';
import { registerHealthEndpoint } from './endpoints/health';
import { registerSessionsEndpoint } from './endpoints/sessions';
import { registerCalendarEndpoint } from './endpoints/calendar';
import { registerSubagentsEndpoint } from './endpoints/subagents';
import { registerCronEndpoint } from './endpoints/cron';
import { registerQueryConfigEndpoint } from './endpoints/query-config';
// import { extractReply } from './chat/replyExtractor'; // not used yet

registerLearningsEndpoint(app, WORKSPACE_ROOT);
registerTrinityEndpoint(app, WORKSPACE_ROOT);
registerKanbanEndpoint(app, WORKSPACE_ROOT);
registerStatsEndpoint(app, WORKSPACE_ROOT);
registerHealthEndpoint(app, WORKSPACE_ROOT);
registerSessionsEndpoint(app);
registerCalendarEndpoint(app);
registerSubagentsEndpoint(app);
registerCronEndpoint(app, WORKSPACE_ROOT);
registerQueryConfigEndpoint(app, WORKSPACE_ROOT);

// Activity Stream endpoints
app.get('/api/v1/activity/events', authenticate, (req: any, res: any) => {
  const { limit, since, type, severity } = req.query;
  let events = activityBroadcaster.getRecentEvents(1000);
  if (type) {
    const t = type as string;
    events = events.filter(e => e.type === t);
  }
  if (severity) {
    const s = severity as string;
    events = events.filter(e => e.severity === s);
  }
  if (since) {
    const sinceDate = new Date(since as string);
    events = events.filter(e => e.timestamp >= sinceDate);
  }
  if (limit) {
    const l = Math.min(Number(limit), 500);
    events = events.slice(-l);
  }
  res.json(events.reverse());
});

app.post('/api/v1/activity/read', authenticate, (req: any, res: any) => {
  const { eventIds } = req.body;
  if (Array.isArray(eventIds)) {
    activityBroadcaster.markAsRead(eventIds);
  }
  res.json({ success: true });
});

app.post('/api/v1/activity/clear-read', authenticate, (req: any, res: any) => {
  activityBroadcaster.clearRead();
  res.json({ success: true });
});

app.get('/api/v1/activity/unread-count', authenticate, (req: any, res: any) => {
  res.json({ count: activityBroadcaster.getUnreadCount() });
});

// Chat endpoint
app.post('/api/v1/chat', authenticate, async (req, res) => {
  try {
    const { message, sessionKey } = req.body;
    if (!sessionKey) return res.status(400).json({ error: 'sessionKey required' });
    const reply = await (globalThis as any).fetch(`${BACKEND_URL}/api/v1/chat/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${BACKEND_API_KEY}` },
      body: JSON.stringify({ message, sessionKey }),
    }).then((r: any) => r.json()).then((d: any) => d.reply);
    res.json({ success: true, reply });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Trace endpoint
app.get('/api/v1/trace', authenticate, async (req, res) => {
  try {
    const { sessionKey, limit } = req.query;
    const raw = await (globalThis as any).fetch(`${BACKEND_URL}/api/v1/chat/trace?sessionKey=${encodeURIComponent(sessionKey as string)}&limit=${limit || 50}`, {
      headers: { Authorization: `Bearer ${BACKEND_API_KEY}` },
    }).then((r: any) => r.json());
    const events = (raw || []).map((ev: any) => ({
      role: ev.role,
      content: ev.content,
      tool: ev.tool,
      timestamp: ev.timestamp,
      // Include additional tool-related fields if present
      params: ev.params ?? undefined,
      result: ev.result ?? undefined,
      error: ev.error ?? undefined,
    }));
    res.json(events);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Tools endpoint - returns available tools from skills
app.get('/api/v1/tools', authenticate, async (req, res) => {
  try {
    const tools = await toolRegistry.scanSkills();
    res.json({ tools });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const server = app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`[backend] Dashboard API listening on port ${PORT}`);
  // Warm up caches after startup to avoid first-request latency
  setTimeout(async () => {
    try {
      console.log('[warm-up] Pre-populating caches...');
      const key = BACKEND_API_KEY;
      await (globalThis as any).fetch(`${BACKEND_URL}/api/v1/stats/overview`, { headers: { Authorization: `Bearer ${key}` } }).catch(() => {});
      await (globalThis as any).fetch(`${BACKEND_URL}/api/v1/system/health`, { headers: { Authorization: `Bearer ${key}` } }).catch(() => {});
      await (globalThis as any).fetch(`${BACKEND_URL}/api/v1/learnings`, { headers: { Authorization: `Bearer ${key}` } }).catch(() => {});
      await (globalThis as any).fetch(`${BACKEND_URL}/api/v1/sessions/active`, { headers: { Authorization: `Bearer ${key}` } }).catch(() => {});
      console.log('[warm-up] Done');
    } catch (e) {
      console.warn('[warm-up] failed:', e);
    }
  }, 2000);
});

// Attach WebSocket and start polling
activityBroadcaster.attach(server, '/ws');
activityBroadcaster.startPolling(2000);
console.log('[server] Activity broadcaster attached to /ws');