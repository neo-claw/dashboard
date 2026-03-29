import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { WebSocket, WebSocketServer } from 'ws';
import { createServer } from 'http';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, readdir, stat } from 'fs/promises';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

import { LRUCache } from './cache/LRUCache';
import { ChatSessionSchema, LearningSchema, GatewayStatusSchema, CronStatusSchema, CreateChatSessionBodySchema, SendChatMessageBodySchema, MessageSchema } from './schemas';
import { parseLearnings } from './parsers/learningsParser';
import { extractReply } from './chat/replyExtractor';
import { sha1 } from './utils';
import { createSession as createRegistrySession, getSessions, getSession, updateSession, deleteSession, loadRegistry, saveRegistry, type Registry } from './sessions/registry';
import { spawnSession, openClawSendMessage, getOpenClawEvents } from './sessions/openClawSession';
import type { ChatSession, Learning, GatewayStatus, CronStatus, Message } from './types';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || '/home/ubuntu/.openclaw/workspace';
const BACKEND_API_KEY = process.env.BACKEND_API_KEY;

// Middleware
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || 'https://neo-claw.vercel.app' }));
app.use(helmet());
app.use(express.json());

const ratelimit = rateLimit({ windowMs: 60_000, max: 100, standardHeaders: true, legacyHeaders: false });
app.use('/api/', ratelimit);

// Auth
function authenticate(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = auth.slice(7);
  if (!BACKEND_API_KEY || token !== BACKEND_API_KEY) {
    return res.status(403).json({ error: 'Invalid API key' });
  }
  next();
}

// Caches
const learningsCache = new LRUCache<string, Learning[]>({ capacity: 1, ttlMs: 60_000 });
const statsCache = new LRUCache<string, any>({ capacity: 1, ttlMs: 15_000 });
const healthCache = new LRUCache<string, any>({ capacity: 1, ttlMs: 10_000 });

// Utils
async function runCommand(cmd: string): Promise<string> {
  const { stdout } = await promisify(exec)(cmd, { maxBuffer: 1024 * 1024 });
  return stdout;
}

function invalidateCachesForFile(filePath: string) {
  // Since our caches are based on computed data, we can expire by TTL.
  // For immediate invalidation, we could delete specific keys if known.
  // For now, rely on TTL.
}

// ============ Health ============
app.get('/api/v1/system/health', authenticate, async (req, res) => {
  const cacheKey = 'health';
  const cached = healthCache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const [gwOut, cronOut, wsOut] = await Promise.allSettled([
      runCommand('openclaw gateway status --json'),
      runCommand('openclaw cron status --json'),
      runCommand('openclaw webui status --json'), // might not exist; ignore errors
    ]);

    const gateway: GatewayStatus = gwOut.status === 'fulfilled' ? JSON.parse(gwOut.value) : { connected: false, uptime: 0, plugins: [], version: '' };
    const cron: CronStatus = cronOut.status === 'fulfilled' ? JSON.parse(cronOut.value) : { jobs: [] };

    // Workspace size
    let sizeBytes = 0;
    let fileCount = 0;
    try {
      // approximate size of workspace
      sizeBytes = (await stat(WORKSPACE_ROOT)).size;
      const files = await readdir(WORKSPACE_ROOT, { withFileTypes: true, recursive: true });
      fileCount = files.length;
    } catch (e) { /* ignore */ }

    const data = { gateway, cron, workspace: { sizeBytes, fileCount } };
    healthCache.set(cacheKey, data);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============ Learnings ============
app.get('/api/v1/learnings', authenticate, async (req, res) => {
  const cached = learningsCache.get('learnings');
  if (cached) return res.json(cached);

  try {
    const learnings = await parseLearnings();
    // Validate with Zod
    const validated = LearningSchema.array().parse(learnings);
    learningsCache.set('learnings', validated);
    res.json(validated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============ Stats Overview ============
app.get('/api/v1/stats/overview', authenticate, async (req, res) => {
  const cached = statsCache.get('stats');
  if (cached) return res.json(cached);

  try {
    const learnings = await parseLearnings();
    const recentLearnings = learnings.slice(0, 5);
    // Count memory entries: approximate by scanning memory/ dir
    const memoryDir = path.join(WORKSPACE_ROOT, 'memory');
    let memoryCount = 0;
    try {
      const files = await readdir(memoryDir);
      memoryCount = files.length;
    } catch (err) { /* ignore */ }

    // Gateway status quick check
    const gwQuick = await runCommand('openclaw gateway status --json').catch(() => '{"connected":false}');
    const gw = JSON.parse(gwQuick);

    const data = {
      learningsCount: learnings.length,
      recentLearnings,
      memoryFilesCount: memoryCount,
      gatewayConnected: gw.connected,
    };
    statsCache.set('stats', data);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============ Calendar (keep existing, add cache maybe later) ============
app.get('/api/v1/calendar', authenticate, async (req, res) => {
  // Existing implementation (unchanged for now)
  try {
    // This endpoint uses GWS CLI to fetch events
    const { stdout } = await promisify(exec)('gws calendar list --json', { maxBuffer: 1024 * 1024 });
    const events = JSON.parse(stdout);
    res.json(events);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============ Trinity runs (unchanged) ============
app.get('/api/v1/trinity/runs', authenticate, async (req, res) => {
  try {
    // Could read from .progress or a log file; placeholder
    res.json([]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============ Kanban tasks (unchanged) ============
app.get('/api/v1/kanban/tasks', authenticate, async (req, res) => {
  try {
    // Implement reading from MEMORY.md Project section
    res.json([]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============ Chat Sessions API ============
const chatRouter = express.Router();
chatRouter.use(authenticate);

// Create new chat session
chatRouter.post('/create', async (req, res) => {
  try {
    const body = CreateChatSessionBodySchema.parse(req.body);
    // Create registry entry
    const session = await createRegistrySession(body.name);
    // Spawn OpenClaw session
    const sessionKey = await spawnSession();
    // Update registry entry with actual OpenClaw session key
    session.sessionKey = sessionKey;
    session.updatedAt = new Date().toISOString();
    await updateSession(session);
    res.status(201).json(ChatSessionSchema.parse(session));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List chat sessions
chatRouter.get('/sessions', async (req, res) => {
  try {
    const sessions = await getSessions();
    res.json(ChatSessionSchema.array().parse(sessions));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Send message to a chat session
chatRouter.post('/:id/send', async (req, res) => {
  try {
    const id = req.params.id;
    const body = SendChatMessageBodySchema.parse(req.body);
    const session = await getSession(id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    const reply = await openClawSendMessage(session.sessionKey, body.message);
    // Update session stats
    session.messageCount += 1;
    session.lastMessage = body.message.substring(0, 100);
    session.updatedAt = new Date().toISOString();
    await updateSession(session);
    res.json({ success: true, reply });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get trace events for a chat session
chatRouter.get('/:id/trace', async (req, res) => {
  try {
    const id = req.params.id;
    const limit = Math.min(Number(req.query.limit) || 50, 500);
    const since = req.query.since as string | undefined;
    const session = await getSession(id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    const rawEvents = await getOpenClawEvents(session.sessionKey, limit, since);
    // Transform to TraceEvent shape
    const events = rawEvents.map(ev => {
      const base = {
        id: `${ev.timestamp}-${Math.random().toString(36).substring(2)}`,
        sessionId: session.id,
        timestamp: ev.timestamp,
        type: ev.type as any,
        data: {} as any,
      };
      if (ev.type === 'message' && ev.message) {
        base.data = {
          message: {
            role: ev.message.role,
            content: typeof ev.message.content === 'string' ? ev.message.content : '',
          },
        };
      } else if (ev.type === 'tool_call') {
        base.data = { tool: { name: ev.tool?.name || 'unknown', params: ev.tool?.params || {}, result: ev.tool?.result } };
      } else if (ev.type === 'file_read') {
        const preview = typeof ev.file?.content === 'string' ? ev.file.content.slice(0, 500) : '';
        base.data = { file: { path: ev.file?.path || '', contentPreview: preview, size: preview.length } };
      } else if (ev.type === 'thinking') {
        base.data = { thinking: { text: ev.thinking?.text || '' } };
      } else if (ev.type === 'system') {
        base.data = { system: { message: ev.system?.message || '' } };
      }
      return base;
    });
    res.json(events);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.use('/api/v1/chat', chatRouter);

// ============ Trace endpoint (legacy, maybe same) ============
app.get('/api/v1/trace', authenticate, async (req, res) => {
  const { sessionKey, limit = '50' } = req.query;
  if (!sessionKey || typeof sessionKey !== 'string') {
    return res.status(400).json({ error: 'sessionKey query required' });
  }
  try {
    const raw = await getOpenClawEvents(sessionKey as string, parseInt(limit as string, 10));
    const events = raw.map(ev => ({
      id: `${ev.timestamp}-${Math.random().toString(36).substring(2)}`,
      sessionId: sessionKey,
      timestamp: ev.timestamp,
      type: ev.type as any,
      data: (() => {
        if (ev.type === 'message' && ev.message) {
          return { message: { role: ev.message.role, content: typeof ev.message.content === 'string' ? ev.message.content : '' } };
        }
        if (ev.type === 'tool_call') {
          return { tool: { name: ev.tool?.name || 'unknown', params: ev.tool?.params || {}, result: ev.tool?.result } };
        }
        if (ev.type === 'file_read') {
          const preview = typeof ev.file?.content === 'string' ? ev.file.content.slice(0, 500) : '';
          return { file: { path: ev.file?.path || '', contentPreview: preview, size: preview.length } };
        }
        if (ev.type === 'thinking') {
          return { thinking: { text: ev.thinking?.text || '' } };
        }
        if (ev.type === 'system') {
          return { system: { message: ev.system?.message || '' } };
        }
        return {};
      })(),
    }));
    res.json(events);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start server
createServer(app).listen(PORT, '0.0.0.0', () => {
  console.log(`[backend] Server listening on port ${PORT}`);
});
