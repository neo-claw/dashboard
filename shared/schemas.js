"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CronStatusSchema = exports.GatewayStatusSchema = exports.DeploymentSchema = exports.TestRunSchema = exports.TestDefinitionSchema = exports.CalendarEventSchema = exports.TaskSchema = exports.MemoryEntrySchema = exports.LearningSchema = exports.ChatSessionSchema = exports.TraceEventSchema = exports.MessageSchema = exports.ThinkingBlockSchema = exports.FileReadSchema = exports.ToolCallSchema = exports.TraceEventTypeEnum = exports.ChatRoleEnum = void 0;
const zod_1 = require("zod");
exports.ChatRoleEnum = zod_1.z.enum(['user', 'assistant']);
exports.TraceEventTypeEnum = zod_1.z.enum(['message', 'tool_call', 'file_read', 'thinking', 'system']);
exports.ToolCallSchema = zod_1.z.object({
    name: zod_1.z.string(),
    params: zod_1.z.record(zod_1.z.any()),
    result: zod_1.z.any().optional(),
    error: zod_1.z.string().optional(),
});
exports.FileReadSchema = zod_1.z.object({
    path: zod_1.z.string(),
    contentPreview: zod_1.z.string().optional(),
    size: zod_1.z.number(),
});
exports.ThinkingBlockSchema = zod_1.z.object({
    text: zod_1.z.string(),
    signature: zod_1.z.string().optional(),
});
exports.MessageSchema = zod_1.z.object({
    id: zod_1.z.string(),
    sessionId: zod_1.z.string(),
    role: exports.ChatRoleEnum,
    content: zod_1.z.string(),
    timestamp: zod_1.z.string(),
});
exports.TraceEventSchema = zod_1.z.object({
    id: zod_1.z.string(),
    sessionId: zod_1.z.string(),
    type: exports.TraceEventTypeEnum,
    timestamp: zod_1.z.string(),
    data: zod_1.z.object({
        message: zod_1.z
            .object({
            role: exports.ChatRoleEnum,
            content: zod_1.z.string(),
        })
            .optional(),
        tool: exports.ToolCallSchema.optional(),
        file: exports.FileReadSchema.optional(),
        thinking: exports.ThinkingBlockSchema.optional(),
        system: zod_1.z
            .object({
            message: zod_1.z.string(),
        })
            .optional(),
    }),
});
exports.ChatSessionSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string().optional(),
    sessionKey: zod_1.z.string(),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
    lastMessage: zod_1.z.string().optional(),
    messageCount: zod_1.z.number(),
});
exports.LearningSchema = zod_1.z.object({
    id: zod_1.z.string(),
    entryDate: zod_1.z.string(),
    bullet: zod_1.z.string(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    sourceFile: zod_1.z.string(),
    lineNumber: zod_1.z.number(),
});
exports.MemoryEntrySchema = zod_1.z.object({
    id: zod_1.z.string(),
    filePath: zod_1.z.string(),
    entryDate: zod_1.z.string(),
    content: zod_1.z.string(),
    type: zod_1.z.enum(['reflection', 'note', 'log']).optional(),
});
exports.TaskSchema = zod_1.z.object({
    id: zod_1.z.string(),
    title: zod_1.z.string(),
    status: zod_1.z.enum(['todo', 'in_progress', 'done']),
    project: zod_1.z.string().optional(),
    dueDate: zod_1.z.string().optional(),
});
exports.CalendarEventSchema = zod_1.z.object({
    id: zod_1.z.string(),
    title: zod_1.z.string(),
    start: zod_1.z.string(),
    end: zod_1.z.string(),
    location: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
});
exports.TestDefinitionSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    file: zod_1.z.string(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.TestRunSchema = zod_1.z.object({
    id: zod_1.z.string(),
    testId: zod_1.z.string(),
    status: zod_1.z.enum(['passed', 'failed', 'skipped']),
    durationMs: zod_1.z.number(),
    error: zod_1.z.string().optional(),
    screenshot: zod_1.z.string().optional(),
    timestamp: zod_1.z.string(),
});
exports.DeploymentSchema = zod_1.z.object({
    id: zod_1.z.string(),
    commit: zod_1.z.string(),
    state: zod_1.z.enum(['success', 'error', 'building']),
    environment: zod_1.z.enum(['production', 'preview']),
    url: zod_1.z.string().optional(),
    createdAt: zod_1.z.string(),
});
exports.GatewayStatusSchema = zod_1.z.object({
    connected: zod_1.z.boolean(),
    uptime: zod_1.z.number(),
    plugins: zod_1.z.array(zod_1.z.string()),
    version: zod_1.z.string(),
});
exports.CronStatusSchema = zod_1.z.object({
    lastRun: zod_1.z.string().optional(),
    nextRun: zod_1.z.string().optional(),
    jobs: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        lastExit: zod_1.z.number(),
    })),
});
