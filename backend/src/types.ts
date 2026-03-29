export type ChatRole = 'user' | 'assistant';
export type TraceEventType = 'message' | 'tool_call' | 'file_read' | 'thinking' | 'system';

export interface Message {
  id: string;
  sessionId: string;
  role: ChatRole;
  content: string;
  timestamp: string;
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
  sessionKey: string;
  createdAt: string;
  updatedAt: string;
  lastMessage?: string;
  messageCount: number;
}

export interface Learning {
  id: string;
  entryDate: string;
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
