import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import path from 'path';
import os from 'os';
import { extractReply } from '../chat/replyExtractor';

const execAsync = promisify(exec);

/**
 * Spawn a new OpenClaw agent session via CLI.
 * Returns the sessionKey (e.g., "agent:main:chat-<id>")
 */
export async function spawnSession(sessionKey?: string): Promise<string> {
  // Use openclaw agent --agent main with a custom session key? Check CLI help.
  // We'll try: openclaw agent --agent main --session-key <key> --timeout 0
  // But simpler: start a new session automatically and capture its key from output.
  // Actually, openclaw agent runs one turn only and exits. For persistent session, we need to use `openclaw sessions spawn`.
  // Let's check: openclaw sessions spawn --agent main
  const cmd = sessionKey
    ? `openclaw sessions spawn --agent main --session-key ${sessionKey}`
    : 'openclaw sessions spawn --agent main';
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
