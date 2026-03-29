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
import { registerLearningsEndpoint } from './src/endpoints/learnings';
import { registerTrinityEndpoint } from './src/endpoints/trinity';
import { registerKanbanEndpoint } from './src/endpoints/kanban';
import { registerStatsEndpoint } from './src/endpoints/stats';
import { registerHealthEndpoint } from './src/endpoints/health';

dotenv.config(); // Load .env file

const execAsync = promisify(exec);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

// Trust ngrok's X-Forwarded-* headers for rate limiting and IP determination
app.set('trust proxy', 1);

app.use(express.json());

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'https://neo-claw-dashboard.vercel.app',
  credentials: false,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Auth middleware (API Key)
const API_KEY = process.env.BACKEND_API_KEY;
app.use('/api/', async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = auth.slice(7);
  if (token !== API_KEY) {
    return res.status(403).json({ error: 'Invalid API key' });
  }
  next();
});

// Workspace file access (sandboxed to workspace root)
const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || '/home/ubuntu/.openclaw/workspace';

// Register endpoints
registerLearningsEndpoint(app, WORKSPACE_ROOT);
registerTrinityEndpoint(app, WORKSPACE_ROOT);
registerKanbanEndpoint(app, WORKSPACE_ROOT);
registerStatsEndpoint(app, WORKSPACE_ROOT);
registerHealthEndpoint(app, WORKSPACE_ROOT);

// Gateway WebSocket helper
const GATEWAY_WS = process.env.GATEWAY_WS || 'ws://localhost:18789';

function gatewayRequest(method: string, params: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(GATEWAY_WS);
    const requestId = Date.now();
    const timeout = setTimeout(() => {
      reject(new Error('Gateway request timeout'));
      ws.close();
    }, 15000);

    ws.on('open', () => {
      ws.send(JSON.stringify({ id: requestId, method, params }));
    });

    ws.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.id === requestId) {
          clearTimeout(timeout);
          if (msg.error) {
            reject(new Error(msg.error?.message || 'Gateway error'));
          } else {
            resolve(msg.result);
          }
          ws.close();
        }
      } catch (e) {
        reject(e);
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

app.get('/api/v1/files/*', async (req, res) => {
  try {
    const relPath = req.path.replace('/api/v1/files/', '');
    const resolved = join(WORKSPACE_ROOT, relPath);
    // Ensure path stays within workspace
    if (!resolved.startsWith(WORKSPACE_ROOT)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const content = await readFile(resolved, 'utf-8');
    res.json({ path: relPath, content });
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return res.status(404).json({ error: 'File not found' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Send chat message to OpenClaw gateway
app.post('/api/v1/chat/send', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Missing message' });
    }
    // Use openclaw agent command to get a response
    const safeMessage = message.replace(/"/g, '\\"');
    const cmd = `openclaw agent --agent main --message "${safeMessage}" --json`;
    const { stdout, stderr } = await execAsync(cmd, { maxBuffer: 1024 * 1024 });
    // Parse the output to extract agent's reply
    let reply = stdout.trim();
    try {
      const parsed = JSON.parse(stdout);
      // Expect { messages: [{ role: 'assistant', content: '...' }] } or similar
      if (parsed.messages && parsed.messages.length > 0) {
        reply = parsed.messages[0].content;
      }
    } catch (e) {
      // leave reply as raw stdout
    }
    res.json({ success: true, reply });
  } catch (err: any) {
    res.status(500).json({ error: err.message, stderr: err.stderr || '' });
  }
});

// Get trace (session history) by reading the session JSONL file
app.get('/api/v1/trace', async (req, res) => {
  try {
    const { sessionKey = 'main', limit = '50' } = req.query;
    const sessionsDir = join(os.homedir(), '.openclaw', 'agents', 'main', 'sessions');
    const sessionsMetaPath = join(sessionsDir, 'sessions.json');
    const meta = JSON.parse(await readFile(sessionsMetaPath, 'utf-8'));

    // meta is an object keyed by sessionKey
    let session: any = null;
    if (typeof sessionKey === 'string' && sessionKey === 'main') {
      session = meta['agent:main:main'];
    } else if (typeof sessionKey === 'string') {
      // Look up by session key first
      session = meta[sessionKey];
      // If not found, maybe it's a sessionId; search values
      if (!session) {
        for (const key of Object.keys(meta)) {
          if (meta[key].sessionId === sessionKey) {
            session = meta[key];
            break;
          }
        }
      }
    }
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const sessionFilePath = session.sessionFile || join(sessionsDir, `${session.sessionId}.jsonl`);
    console.log('[trace] sessionFilePath:', sessionFilePath);
    const content = await readFile(sessionFilePath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    const max = parseInt(limit as string, 10) || 50;
    const rawEvents = lines.slice(-max).map(line => JSON.parse(line));
    // Flatten message events: { type: 'message', message: { role, content }, timestamp } -> { role, content, timestamp }
    const events = rawEvents.map(ev => {
      if (ev.type === 'message' && ev.message) {
        let content = ev.message.content;
        if (Array.isArray(content)) {
          content = content.filter((p:any) => p.type === 'text').map((p:any) => p.text).join('\n');
        }
        return {
          role: ev.message.role,
          content,
          timestamp: ev.timestamp,
        };
      }
      return ev;
    });
    res.json(events);
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return res.status(404).json({ error: 'Session file not found' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Get calendar events via gws
app.get('/api/v1/calendar', async (req, res) => {
  try {
    const { stdout } = await execAsync('gws calendar +agenda --today --calendar bonato@usc.edu --format json');
    res.json(JSON.parse(stdout));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});



// System status
app.get('/api/v1/status', async (req, res) => {
  try {
    const [cronOut, gatewayOut] = await Promise.all([
      execAsync('openclaw cron status --json'),
      execAsync('openclaw gateway status --json'),
    ]);
    res.json({
      cron: JSON.parse(cronOut.stdout),
      gateway: JSON.parse(gatewayOut.stdout),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[backend] Dashboard API listening on port ${PORT}`);
});
