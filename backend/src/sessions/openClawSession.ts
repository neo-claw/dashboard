import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import path from 'path';
import os from 'os';
import yaml from 'js-yaml';
import { extractReply } from '../chat/replyExtractor';

const execAsync = promisify(exec);

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || '/home/ubuntu/.openclaw/workspace';
const CONFIG_PATH = path.join(WORKSPACE_ROOT, 'config/subagent-models.yaml');

interface SubagentModelsConfig {
  allowed_models: string[];
  default_model: string;
  restricted: boolean;
}

async function loadConfig(): Promise<SubagentModelsConfig> {
  try {
    const content = await readFile(CONFIG_PATH, 'utf-8');
    const parsed = yaml.load(content) as any;
    return {
      allowed_models: Array.isArray(parsed.allowed_models) ? parsed.allowed_models : [],
      default_model: parsed.default_model || '',
      restricted: !!parsed.restricted,
    };
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return { allowed_models: [], default_model: '', restricted: false };
    }
    throw err;
  }
}

/**
 * Spawn a new OpenClaw agent session via CLI.
 * Optionally specify the model to use for the subagent.
 * Returns the sessionKey (e.g., "agent:main:chat-<id>")
 */
export async function spawnSession(sessionKey?: string, options?: { model?: string }): Promise<string> {
  const config = await loadConfig();
  // Determine which model to use: requested model or default from config
  const requestedModel = options?.model;
  const modelToUse = requestedModel || config.default_model;
  // If restricted is true, enforce that a model is specified (or default set) and it is in the allowed list
  if (config.restricted) {
    if (!modelToUse) {
      throw new Error('Cannot spawn subagent: no model specified and no default configured. Provide a model or set a default_model in config.');
    }
    if (!config.allowed_models.includes(modelToUse)) {
      throw new Error(`Model '${modelToUse}' is not in the allowed subagent models list. Allowed: ${config.allowed_models.join(', ')}`);
    }
  }
  // Build command with model flag if we have a model to set
  let cmd = sessionKey
    ? `openclaw sessions spawn --agent main --session-key ${sessionKey}`
    : 'openclaw sessions spawn --agent main';
  if (modelToUse) {
    cmd += ` --model ${modelToUse}`;
  }
  const { stdout } = await execAsync(cmd, { maxBuffer: 1024 * 1024 });
  // Expected output: "Session started: agent:main:xxxxx"
  const match = stdout.match(/Session\s+started:\s+([^\s]+)/);
  if (match) {
    return match[1];
  }
  // Fallback: maybe JSON output with --json
  try {
    const parsed = JSON.parse(stdout);
    if (parsed.sessionKey) return parsed.sessionKey;
  } catch {}
  throw new Error(`Failed to spawn OpenClaw session: ${stdout}`);
}

/**
 * Send a message to an existing OpenClaw session.
 */
export async function sendMessage(sessionKey: string, message: string): Promise<string> {
  // Use openclaw agent to send to a specific session? There is `openclaw sessions send`.
  // We'll use: openclaw agent --agent main --session-key <sessionKey> --message "<msg>" --json
  // Check: openclaw agent --help indicates it can run a single turn in a session.
  // Alternatively: openclaw sessions send <sessionKey> "<msg>"
  // Let's try the sessions send: openclaw sessions send <sessionKey> "<message>"
  // That will forward to the agent and return output.
  const safeMsg = message.replace(/"/g, '\\"');
  const cmd = `openclaw sessions send ${sessionKey} "${safeMsg}"`;
  const { stdout, stderr } = await execAsync(cmd, { maxBuffer: 1024 * 1024 });
  // The output includes the agent's response. We'll extract plain text.
  const reply = extractReply(stdout);
  if (!reply && stderr) {
    throw new Error(`Failed to get reply: ${stderr}`);
  }
  return reply.trim();
}

/**
 * Get trace events from an OpenClaw session's JSONL file.
 */
export async function getSessionEvents(sessionKey: string, limit = 50, since?: string): Promise<any[]> {
  // Locate session directory
  const home = os.homedir();
  const sessionsDir = path.join(home, '.openclaw', 'agents', 'main', 'sessions');
  // Load sessions meta to find sessionId
  const metaPath = path.join(sessionsDir, 'sessions.json');
  let meta: Record<string, any> = {};
  try {
    const metaContent = await readFile(metaPath, 'utf-8');
    meta = JSON.parse(metaContent);
  } catch (err: any) {
    throw new Error(`Cannot read sessions meta: ${err.message}`);
  }
  let sessionMeta = meta[sessionKey];
  if (!sessionMeta) {
    // Try to find by sessionId in values
    for (const key of Object.keys(meta)) {
      if (meta[key].sessionId === sessionKey) {
        sessionMeta = meta[key];
        break;
      }
    }
  }
  if (!sessionMeta) {
    throw new Error(`Session not found: ${sessionKey}`);
  }
  const sessionFilePath = sessionMeta.sessionFile || path.join(sessionsDir, `${sessionMeta.sessionId}.jsonl`);
  const content = await readFile(sessionFilePath, 'utf-8');
  const lines = content.trim().split('\n').filter(Boolean);
  let events = lines.map(line => JSON.parse(line));
  if (since) {
    const sinceTime = new Date(since).getTime();
    events = events.filter(ev => new Date(ev.timestamp).getTime() > sinceTime);
  }
  return events.slice(-limit);
}
