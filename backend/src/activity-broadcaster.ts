import { WebSocket, WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { readFile } from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || '/home/ubuntu/.openclaw/workspace';

export interface ActivityEvent {
  id: string;
  type: 'subagent_start' | 'subagent_stop' | 'cron_start' | 'cron_complete' | 'cron_fail' | 'config_change' | 'gateway_connected' | 'gateway_disconnected' | 'system_health' | 'info' | 'error' | 'warning';
  severity: 'info' | 'warning' | 'error';
  title: string;
  description?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  read: boolean;
}

export class ActivityBroadcaster {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private events: ActivityEvent[] = [];
  private maxEvents = 1000;

  // Track previous state
  private lastSessions: Map<string, any> = new Map();
  private lastGatewayConnected = false;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;

  attach(server: any, path: string = '/ws') {
    this.wss = new WebSocketServer({ server, path });
    console.log(`[activity] WebSocket server mounted on ${path}`);

    this.wss.on('connection', (ws, req) => {
      console.log('[activity] Client connected');
      this.clients.add(ws);

      // Send recent events on connect
      const recent = this.events.slice(-50).reverse();
      ws.send(JSON.stringify({ type: 'init', events: recent }));

      ws.on('close', () => {
        this.clients.delete(ws);
      });
      ws.on('error', (err) => {
        console.error('[activity] WS error:', err);
      });
    });
  }

  startPolling(intervalMs: number = 5000) {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
    this.pollingInterval = setInterval(() => this.pollForChanges(), intervalMs);
  }

  stop() {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
    this.wss?.close();
    this.clients.forEach(ws => ws.close());
    this.clients.clear();
  }

  addClient(ws: WebSocket) {
    this.clients.add(ws);
    const recent = this.events.slice(-50).reverse();
    ws.send(JSON.stringify({ type: 'init', events: recent }));
  }

  removeClient(ws: WebSocket) {
    this.clients.delete(ws);
  }

  getRecentEvents(count: number = 100) {
    return this.events.slice(-count);
  }

  getUnreadCount(): number {
    return this.events.filter(ev => !ev.read).length;
  }

  markAsRead(eventIds: string[]) {
    const ids = new Set(eventIds);
    this.events.forEach(ev => {
      if (ids.has(ev.id)) ev.read = true;
    });
  }

  clearRead() {
    this.events = this.events.filter(ev => !ev.read);
  }

  private broadcast(event: ActivityEvent) {
    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
    const message = JSON.stringify({ type: 'event', event });
    this.clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) ws.send(message);
    });
  }

  // Event emitters
  subagentStarted(sessionKey: string, agentId: string, metadata?: any) {
    this.broadcast({
      id: uuidv4(),
      type: 'subagent_start',
      severity: 'info',
      title: `Subagent ${agentId.slice(0, 8)} started`,
      description: `Session ${sessionKey.slice(0, 12)}...`,
      timestamp: new Date(),
      metadata: { sessionKey, agentId, ...metadata },
      read: false,
    });
  }

  subagentStopped(sessionKey: string, agentId: string, durationSec?: number, metadata?: any) {
    this.broadcast({
      id: uuidv4(),
      type: 'subagent_stop',
      severity: 'info',
      title: `Subagent ${agentId.slice(0, 8)} completed`,
      description: durationSec ? `Ran for ${durationSec}s` : `Session ended`,
      timestamp: new Date(),
      metadata: { sessionKey, agentId, durationSec, ...metadata },
      read: false,
    });
  }

  gatewayConnected(uptime?: number) {
    this.broadcast({
      id: uuidv4(),
      type: 'gateway_connected',
      severity: 'info',
      title: 'Gateway connected',
      description: uptime ? `Uptime: ${uptime}s` : undefined,
      timestamp: new Date(),
      metadata: { uptime },
      read: false,
    });
  }

  gatewayDisconnected() {
    this.broadcast({
      id: uuidv4(),
      type: 'gateway_disconnected',
      severity: 'error',
      title: 'Gateway disconnected',
      timestamp: new Date(),
      read: false,
    });
  }

  systemHealth(health: any) {
    this.broadcast({
      id: uuidv4(),
      type: 'system_health',
      severity: 'info',
      title: 'System health updated',
      description: `Agents: ${health.agents?.length || 0}, Workspace: ${health.workspace?.fileCount || 0} files`,
      timestamp: new Date(),
      metadata: health,
      read: false,
    });
  }

  configChanged(file: string, changeType: 'modified' | 'created' | 'deleted', details?: string) {
    this.broadcast({
      id: uuidv4(),
      type: 'config_change',
      severity: 'warning',
      title: `Config ${changeType}: ${file}`,
      description: details,
      timestamp: new Date(),
      metadata: { file, changeType, details },
      read: false,
    });
  }

  // Polling
  private async fetchSessions(): Promise<any[]> {
    try {
      // Read sessions directly from the JSON file for speed and reliability.
      // The sessions file lives in OPENCLAW_HOME/agents/main/sessions/sessions.json.
      const openclawHome = process.env.OPENCLAW_HOME || path.join(WORKSPACE_ROOT, '..'); // fallback to sibling .openclaw
      const sessionsPath = path.join(openclawHome, 'agents', 'main', 'sessions', 'sessions.json');
      const content = await readFile(sessionsPath, 'utf-8');
      const data = JSON.parse(content);
      const rawSessions = data.sessions || [];
      // Only subagents (keys containing :subagent:)
      return rawSessions.filter((s: any) => s.key?.includes(':subagent:'));
    } catch (e) {
      console.error('[activity] Failed to fetch sessions:', e);
      return [];
    }
  }

  private async checkGateway(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('openclaw gateway status --json');
      const status = JSON.parse(stdout);
      return status.connected || false;
    } catch (e) {
      return false;
    }
  }

  private async pollForChanges() {
    try {
      const currentSessions = await this.fetchSessions();
      const currentGateway = await this.checkGateway();

      // New subagents
      for (const session of currentSessions) {
        const key = session.key;
        if (!this.lastSessions.has(key)) {
          this.subagentStarted(key, session.agentId, { model: session.metadata?.model });
        }
      }

      // Stopped subagents
      for (const [key, old] of this.lastSessions.entries()) {
        if (!currentSessions.find((s: any) => s.key === key) && old.active) {
          const durationSec = old.durationSec || Math.floor((Date.now() - new Date(old.createdAt).getTime()) / 1000);
          this.subagentStopped(key, old.agentId, durationSec, { model: old.metadata?.model });
        }
      }

      // Gateway changes
      if (currentGateway !== this.lastGatewayConnected) {
        if (currentGateway) this.gatewayConnected();
        else this.gatewayDisconnected();
        this.lastGatewayConnected = currentGateway;
      }

      // Refresh last sessions
      this.lastSessions.clear();
      for (const s of currentSessions) {
        this.lastSessions.set(s.key, s);
      }

      // Also broadcast health update occasionally (every 5 min)
      if (Math.floor(Date.now() / 300000) !== Math.floor(Date.now() / 300000 - 5)) {
        // approx every 5 min; could be improved
        this.systemHealth({ agents: currentSessions, workspace: { fileCount: currentSessions.length } });
      }
    } catch (err) {
      console.error('[activity] Polling error:', err);
    }
  }
}

// Singleton
export const activityBroadcaster = new ActivityBroadcaster();
