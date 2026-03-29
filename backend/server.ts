import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';

dotenv.config(); // Load .env file

const execAsync = promisify(exec);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

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
    const { message, sessionKey } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Missing message' });
    }
    // Use openclaw CLI to send (works reliably)
    const safeMessage = message.replace(/"/g, '\\"');
    const cmd = `openclaw sessions send ${sessionKey || 'main'} "${safeMessage}"`;
    const { stdout, stderr } = await execAsync(cmd, { maxBuffer: 1024 * 1024 });
    res.json({ success: true, output: stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message, stderr: err.stderr || '' });
  }
});

// Get trace (session history)
app.get('/api/v1/trace', async (req, res) => {
  try {
    const { sessionKey, limit = '50' } = req.query;
    const cmd = `openclaw sessions history ${sessionKey || 'main'} --limit ${limit} --json`;
    const { stdout } = await execAsync(cmd, { maxBuffer: 1024 * 1024 });
    const parsed = JSON.parse(stdout);
    // Expect array of messages
    res.json(Array.isArray(parsed) ? parsed : parsed.messages || []);
  } catch (err: any) {
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
