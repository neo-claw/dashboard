export const ChatRole = ['user', 'assistant'] as const;
export type ChatRole = typeof ChatRole[number];

export const TraceEventType = ['message', 'tool_call', 'file_read', 'thinking', 'system'] as const;
export type TraceEventType = typeof TraceEventType[number];

export interface Message {
  id: string;
  sessionId: string;
  role: ChatRole;
  content: string;
  timestamp: string; // ISO
}

export interface ToolCall {
  name: string;
  params: Record<string, any>;
  result?: any;
  error?: string;
}

export interface FileRead {
  path: string;
  contentPreview?: string;
  size: number;
}

export interface ThinkingBlock {
  text: string;
  signature?: string;
}

export interface TraceEvent {
  id: string;
  sessionId: string;
  type: TraceEventType;
  timestamp: string;
  data: {
    message?: { role: ChatRole; content: string };
    tool?: ToolCall;
    file?: FileRead;
    thinking?: ThinkingBlock;
    system?: { message: string };
  };
}

export interface ChatSession {
  id: string;
  name?: string;
  sessionKey: string; // OpenClaw session key
  createdAt: string;
  updatedAt: string;
  lastMessage?: string;
  messageCount: number;
}

export interface Learning {
  id: string;
  entryDate: string; // YYYY-MM-DD
  bullet: string;
  tags?: string[];
  sourceFile: string;
  lineNumber: number;
}

export interface MemoryEntry {
  id: string;
  filePath: string;
  entryDate: string;
  content: string;
  type?: 'reflection' | 'note' | 'log';
}

export interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  project?: string;
  dueDate?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
}

export interface TestDefinition {
  id: string;
  name: string;
  file: string;
  tags?: string[];
}

export interface TestRun {
  id: string;
  testId: string;
  status: 'passed' | 'failed' | 'skipped';
  durationMs: number;
  error?: string;
  screenshot?: string;
  timestamp: string;
}

export interface Deployment {
  id: string;
  commit: string;
  state: 'success' | 'error' | 'building';
  environment: 'production' | 'preview';
  url?: string;
  createdAt: string;
}

export interface GatewayStatus {
  connected: boolean;
  uptime: number;
  plugins: string[];
  version: string;
}

export interface CronStatus {
  lastRun?: string;
  nextRun?: string;
  jobs: { name: string; lastExit: number }[];
}

// Tool Contract
export interface OpenClawTool {
  name: string;
  description: string;
  inputSchema: any; // Zod schema (but stored as JSON Schema or raw)
  outputSchema?: any;
  permissions: string[];
  skill: string;
  execute: (params: any, ctx: ToolContext) => Promise<any | AsyncIterable<ToolChunk>>;
}

export interface ToolContext {
  sessionKey: string;
  // future: userId, approvals, etc.
}

export type ToolResult = { success: boolean; result?: any; error?: string };

export interface ToolChunk {
  type: 'progress' | 'partial' | 'complete';
  data?: any;
  error?: string;
}
