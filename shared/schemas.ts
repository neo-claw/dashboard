import { z } from 'zod';
import type {
  ChatRole,
  TraceEventType,
  Message,
  ToolCall,
  FileRead,
  ThinkingBlock,
  TraceEvent,
  ChatSession,
  Learning,
  MemoryEntry,
  Task,
  CalendarEvent,
  TestDefinition,
  TestRun,
  Deployment,
  GatewayStatus,
  CronStatus,
} from './types';

export const ChatRoleEnum = z.enum(['user', 'assistant'] as const);
export type ChatRole = z.infer<typeof ChatRoleEnum>;

export const TraceEventTypeEnum = z.enum(['message', 'tool_call', 'file_read', 'thinking', 'system'] as const);
export type TraceEventType = z.infer<typeof TraceEventTypeEnum>;

export const ToolCallSchema = z.object({
  name: z.string(),
  params: z.record(z.any()),
  result: z.any().optional(),
  error: z.string().optional(),
});

export const FileReadSchema = z.object({
  path: z.string(),
  contentPreview: z.string().optional(),
  size: z.number(),
});

export const ThinkingBlockSchema = z.object({
  text: z.string(),
  signature: z.string().optional(),
});

export const MessageSchema: z.ZodType<Message> = z.object({
  id: z.string(),
  sessionId: z.string(),
  role: ChatRoleEnum,
  content: z.string(),
  timestamp: z.string(),
});

export const TraceEventSchema: z.ZodType<TraceEvent> = z.object({
  id: z.string(),
  sessionId: z.string(),
  type: TraceEventTypeEnum,
  timestamp: z.string(),
  data: z.object({
    message: z
      .object({
        role: ChatRoleEnum,
        content: z.string(),
      })
      .optional(),
    tool: ToolCallSchema.optional(),
    file: FileReadSchema.optional(),
    thinking: ThinkingBlockSchema.optional(),
    system: z
      .object({
        message: z.string(),
      })
      .optional(),
  }),
});

export const ChatSessionSchema: z.ZodType<ChatSession> = z.object({
  id: z.string(),
  name: z.string().optional(),
  sessionKey: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastMessage: z.string().optional(),
  messageCount: z.number(),
});

export const LearningSchema: z.ZodType<Learning> = z.object({
  id: z.string(),
  entryDate: z.string(),
  bullet: z.string(),
  tags: z.array(z.string()).optional(),
  sourceFile: z.string(),
  lineNumber: z.number(),
});

export const MemoryEntrySchema: z.ZodType<MemoryEntry> = z.object({
  id: z.string(),
  filePath: z.string(),
  entryDate: z.string(),
  content: z.string(),
  type: z.enum(['reflection', 'note', 'log']).optional(),
});

export const TaskSchema: z.ZodType<Task> = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(['todo', 'in_progress', 'done']),
  project: z.string().optional(),
  dueDate: z.string().optional(),
});

export const CalendarEventSchema: z.ZodType<CalendarEvent> = z.object({
  id: z.string(),
  title: z.string(),
  start: z.string(),
  end: z.string(),
  location: z.string().optional(),
  description: z.string().optional(),
});

export const TestDefinitionSchema: z.ZodType<TestDefinition> = z.object({
  id: z.string(),
  name: z.string(),
  file: z.string(),
  tags: z.array(z.string()).optional(),
});

export const TestRunSchema: z.ZodType<TestRun> = z.object({
  id: z.string(),
  testId: z.string(),
  status: z.enum(['passed', 'failed', 'skipped']),
  durationMs: z.number(),
  error: z.string().optional(),
  screenshot: z.string().optional(),
  timestamp: z.string(),
});

export const DeploymentSchema: z.ZodType<Deployment> = z.object({
  id: z.string(),
  commit: z.string(),
  state: z.enum(['success', 'error', 'building']),
  environment: z.enum(['production', 'preview']),
  url: z.string().optional(),
  createdAt: z.string(),
});

export const GatewayStatusSchema: z.ZodType<GatewayStatus> = z.object({
  connected: z.boolean(),
  uptime: z.number(),
  plugins: z.array(z.string()),
  version: z.string(),
});

export const CronStatusSchema: z.ZodType<CronStatus> = z.object({
  lastRun: z.string().optional(),
  nextRun: z.string().optional(),
  jobs: z.array(
    z.object({
      name: z.string(),
      lastExit: z.number(),
    })
  ),
});
