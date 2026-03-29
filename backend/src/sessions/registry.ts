import { promises as fs } from 'fs';
import path from 'path';
import { ChatSession } from '../types';
import { v4 as uuidv4 } from 'uuid';

const REGISTRY_DIR = path.join(process.env.WORKSPACE_ROOT || '/home/ubuntu/.openclaw/workspace', 'dashboard/backend/data');
const REGISTRY_PATH = path.join(REGISTRY_DIR, 'chat-sessions.json');

export interface Registry {
  sessions: ChatSession[];
  version: number;
}

export async function loadRegistry(): Promise<Registry> {
  try {
    await fs.access(REGISTRY_DIR);
  } catch {
    await fs.mkdir(REGISTRY_DIR, { recursive: true });
  }
  try {
    const data = await fs.readFile(REGISTRY_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return { sessions: [], version: 1 };
    }
    throw err;
  }
}

export async function saveRegistry(registry: Registry): Promise<void> {
  await fs.mkdir(path.dirname(REGISTRY_PATH), { recursive: true });
  await fs.writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2), 'utf-8');
}

export async function createSession(name?: string): Promise<ChatSession> {
  const registry = await loadRegistry();
  const now = new Date().toISOString();
  const id = uuidv4();
  // We'll spawn an OpenClaw session via CLI later; for now just store registry entry
  const session: ChatSession = {
    id,
    name,
    sessionKey: `agent:main:chat-${id}`, // will be replaced after spawn
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
    lastMessage: undefined,
  };
  registry.sessions.push(session);
  await saveRegistry(registry);
  return session;
}

export async function getSessions(): Promise<ChatSession[]> {
  const registry = await loadRegistry();
  return registry.sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function getSession(id: string): Promise<ChatSession | undefined> {
  const registry = await loadRegistry();
  return registry.sessions.find(s => s.id === id);
}

export async function updateSession(session: ChatSession): Promise<void> {
  const registry = await loadRegistry();
  const idx = registry.sessions.findIndex(s => s.id === session.id);
  if (idx !== -1) {
    registry.sessions[idx] = session;
    await saveRegistry(registry);
  }
}

export async function deleteSession(id: string): Promise<boolean> {
  const registry = await loadRegistry();
  const before = registry.sessions.length;
  registry.sessions = registry.sessions.filter(s => s.id !== id);
  if (registry.sessions.length < before) {
    await saveRegistry(registry);
    return true;
  }
  return false;
}
