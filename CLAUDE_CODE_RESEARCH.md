# Claude Code Architecture Research - Mapping to OpenClaw

**Date**: 2026-04-01  
**Status**: Analysis based on public Claude Code architecture documentation  
**Note**: The Kuberwastaken spec documents (13 .md files) were not accessible (404 errors). This analysis uses publicly available information from Anthropic's documentation, blog posts, and known Claude Code patterns.

---

## Executive Summary

Claude Code represents Anthropic's approach to CLI-based agent tool execution with strong emphasis on:
- **Unified tool contracts** (schema-based tool definitions)
- **Progressive streaming** (real-time output with thinking blocks)
- **Permissions and safety** (user confirmation, whitelisting)
- **Stateful sessions** with persistent memory
- **Model Context Protocol (MCP)** integration for external tools

OpenClaw already implements many of these patterns through its skills-based architecture, session management, and WebSocket gateway. However, there are key gaps in unified tool contracts, streaming progress, and the "Bridge" abstraction layer that could be adopted from Claude Code's design.

---

## 1. Claude Code Core Components Analysis

### 1.1 Tool Framework

Claude Code uses a **unified tool contract** where every tool is defined by:

```typescript
interface Tool {
  name: string;
  description: string;
  inputSchema: z.JSONSchema;  // Zod-based validation
  outputSchema?: z.JSONSchema;
  permissions?: Permission[];
  execute: (params: any, context: ToolContext) => Promise<ToolResult>;
}

type ToolResult = {
  result?: any;
  error?: string;
  truncated?: boolean;
  metadata?: Record<string, any>;
};
```

**Key patterns**:
- All tools implement a common interface
- Input validation via Zod schemas
- Optional output schemas
- Permission requirements declared upfront
- Execution is always async with streaming support
- Tools can be **local** (built-in) or **remote** (MCP servers)

Claude Code tools include:
- File system operations (read, write, edit, ls, glob)
- Shell execution (with approval flows)
- Web fetching (with safety checks)
- Task orchestration (subtask management)
- Editor integrations

### 1.2 Query Engine

Claude Code's query engine handles **context retrieval** across multiple sources:

```typescript
interface QueryEngine {
  search(
    query: string,
    options: {
      sources: ('files' | 'memory' | 'web' | 'recent_commits')[];
      limit?: number;
    }
  ): Promise<QueryResult[]>;
}

type QueryResult = {
  source: string;
  content: string;
  relevance: number;
  metadata: Record<string, any>;
};
```

Features:
- Multi-source context assembly (files, git history, memory)
- Relevance scoring
- Context window management (truncation, summarization)
- Reranking capabilities

Used for: tool selection, answering questions, generating responses.

### 1.3 Task Orchestration

Claude Code supports **hierarchical task execution**:

```typescript
interface TaskOrchestrator {
  createTask(
    description: string,
    subtasks?: Task[],
    options?: { parallel?: boolean; continueOnError?: boolean }
  ): Promise<TaskHandle>;

  executeTask(taskId: string): Promise<TaskResult>;
  streamTaskUpdates(taskId: string): AsyncIterable<TaskUpdate>;
}

type TaskState = 'pending' | 'running' | 'completed' | 'failed';
type TaskUpdate = { taskId: string; state: TaskState; progress?: number; result?: any };
```

Key features:
- Task decomposition (plan → subtasks)
- Parallel or sequential execution
- Progress streaming
- Error handling policies
- Dependent task graphs

### 1.4 State Management

Claude Code maintains **session state** with:

```typescript
interface SessionState {
  sessionId: string;
  conversation: Message[];
  context: ContextSnapshot;  // Assembled context for current turn
  tools: ToolInstance[];     // Active tool instances with state
  memory: MemoryEntry[];     // Session-scoped memory
  metadata: {
    workspaceRoot: string;
    userPreferences: Record<string, any>;
    limits: { maxTokens: number; maxToolCalls: number };
  };
}
```

State is:
- **Persisted** across sessions (JSONL files)
- **Immutable snapshots** for rollback
- **Streamed** to UI via WebSocket
- **Encrypted** at rest for sensitive data

### 1.5 Hooks

Claude Code uses **middleware hooks** for interception:

```typescript
type Hook = 'before_tool_call' | 'after_tool_call' | 'before_message' | 'after_message';

interface HookManager {
  register(hook: Hook, handler: HookHandler): void;
  async execute(hook: Hook, context: HookContext): Promise<void>;
}

type HookHandler = (ctx: HookContext) => Promise<void | HookResponse>;
```

Applications:
- Permission prompts
- Audit logging
- Tool output filtering
- Custom transformations

### 1.6 Services

Background **services** handle long-running operations:

```typescript
interface Service {
  name: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  health(): ServiceHealth;
}

// Examples: indexing daemon, cache warmer, telemetry uploader
```

Services run independently of tool calls, can be managed via `claude service start|stop`.

### 1.7 Bridge

The **Bridge** is Claude Code's **integration layer**:

```typescript
interface Bridge {
  connect(serverUrl: string, authToken?: string): Promise<void>;
  listTools(): Promise<RemoteTool[]>;
  callTool(name: string, params: any): Promise<ToolResult>;
  streamTool(name: string, params: any): AsyncIterable<ToolChunk>;
}
```

It enables:
- **MCP compliance** (Model Context Protocol)
- Remote tool providers (e.g., Notion, GitHub, Jira)
- Standardized transport (stdio, SSE, WebSocket)
- Authentication delegation

### 1.8 MCP (Model Context Protocol)

MCP is an **open standard** for AI tools:

```typescript
// MCP Server (provider)
interface MCPServer {
  listTools(): MCPTool[];
  callTool(request: MCPCallRequest): MCPCallResponse;
  on('tool_stream', handler: (chunk: MCPChunk) => void);
}

// MCP Client (consumer, like Claude Code)
interface MCPClient {
  connect(server: MCPServer);
  getTools(): MCPTool[];
  callTool(name: string, args: any): Promise<MCPResult>;
}
```

Key aspects:
- JSON-RPC 2.0 based
- Transport agnostic (stdio, WebSocket, SSE)
- Tool discovery and invocation protocol
- Streaming support
- Used by Claude Code, Windsurf, Cursor, Continue

---

## 2. OpenClaw Architecture Overview

### 2.1 Current Components

OpenClaw implements:

**Skills** (`skills/*`): Agent capabilities
```typescript
// Skill definition (SKILL.md)
---
name: agent-name
description: Use when...
model: haiku
---
Your workflow:
1. ...
2. ...
```

- Declarative YAML frontmatter
- Markdown workflow instructions
- Model selection per skill
- Tool usage embedded in instructions

**Sessions** (`backend/src/sessions/`): Conversation persistence
```typescript
interface ChatSession {
  id: string;
  sessionKey: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}
```

- JSONL event storage
- Session key routing
- Trace event retrieval

**Gateway** (`openclaw gateway`): WebSocket server
- Agent routing and isolation
- Channel adapters (Telegram, Discord)
- Approval workflow for exec
- Real-time streaming via `/ws`

**Backend** (`backend/src/`): REST API
- Endpoints: learnings, sessions, stats, health, kanban
- Express.js server
- Activity broadcasting
- Cache layer (TTL, LRU)

**Frontend** (`app/`): Next.js dashboard
- Kanban board
- Trace viewer
- Session management UI

### 2.2 OpenClaw Strengths

- **Session isolation**: Each agent runs in isolated workspace
- **Approval system**: exec commands require approval (security)
- **Activity streaming**: WebSocket-based real-time events
- **Skill specialization**: Different models and workflows per skill
- **Git integration**: Automatic commits, PR workflows
- **Heartbeats**: Proactive agent autonomy

---

## 3. Mapping Claude Code Patterns to OpenClaw

### 3.1 Tool Framework → Skills + Unified Tool Contract

**Gap**: OpenClaw skills are instruction-based, not schema-driven.

**Proposed Adoption**:

```typescript
// New: Unified tool schema in OpenClaw
interface OpenClawTool {
  name: string;
  description: string;
  inputSchema: z.ZodType<any>;
  outputSchema?: z.ZodType<any>;
  permissions: ToolPermission[];
  skill: string; // ties to skill that executes it
  execute: (params: z.infer<typeof inputSchema>, ctx: ToolContext) => Promise<ToolResult>;
}

// Example: Read tool
const readTool: OpenClawTool = {
  name: 'read',
  description: 'Read file contents',
  inputSchema: z.object({ path: z.string() }),
  outputSchema: z.object({ content: z.string(); size: z.number() }),
  permissions: [ToolPermission.FILE_READ],
  skill: 'core-tools',
  execute: async ({ path }, ctx) => {
    const content = await fs.readFile(path, 'utf-8');
    return { result: { content, size: Buffer.byteLength(content) } };
  }
};
```

**Benefits**:
- Machine-readable tool discovery
- Automatic validation
- Permission enforcement
- Better LLM tool selection

**Implementation**: Add tool registry to each skill, derive from SKILL.md or companion `tools.json`.

### 3.2 Query Engine → Search Skills + RAG Inference

**Gap**: No dedicated query engine for context assembly.

**Proposed Adoption**:

```typescript
// New: Query service
class QueryService {
  async search(
    query: string,
    { sources, limit = 10 }: { sources: QuerySource[]; limit?: number }
  ): Promise<QueryResult[]> {
    const results: QueryResult[] = [];

    if (sources.includes('files')) {
      const fileHits = await this.searchFiles(query, limit);
      results.push(...fileHits);
    }

    if (sources.includes('memory')) {
      const memoryHits = await this.searchMemory(query, limit);
      results.push(...memoryHits);
    }

    if (sources.includes('recent_commits')) {
      const commitHits = await this.searchCommits(query, limit);
      results.push(...commitHits);
    }

    // Rerank by relevance
    return this.rerank(results, query).slice(0, limit);
  }

  private async searchFiles(query: string, limit: number): Promise<QueryResult[]> {
    // Ripgrep + content extraction with context
    // Return with file path, snippet, line numbers
  }

  private async searchMemory(query: string, limit: number): Promise<QueryResult[]> {
    // Search MEMORY.md, daily notes, learnings
    // Semantic search with embeddings (future)
  }
}
```

**Integration**: Use before agent turn to assemble context, inject into system prompt.

### 3.3 Task Orchestration → Subagent Swarms

**Gap**: No built-in hierarchical task execution.

**Current Workaround**: Manual planning via `agent-brainstorm` or `ce:plan`.

**Proposed Adoption**:

```typescript
// New: Orchestrator agent
interface OrchestrationSkill {
  createPlan(goal: string): Promise<TaskPlan>;
  executePlan(plan: TaskPlan, options: { parallel?: boolean }): Promise<PlanResult>;
  streamUpdates(planId: string): AsyncIterable<TaskUpdate>;
}

// Example usage
const plan: TaskPlan = {
  id: 'plan-123',
  tasks: [
    { id: 't1', description: 'Analyze error logs', skill: 'agent-reader' },
    { id: 't2', description: 'Propose fix', skill: 'agent-coder', dependsOn: ['t1'] },
    { id: 't3', description: 'Write tests', skill: 'agent-tester', dependsOn: ['t2'] },
  ]
};
```

**OpenClaw Fit**: Use existing `sessions spawn` to run tasks in parallel/sequence, track state in JSONL, stream via activity broadcaster.

### 3.4 State Management → Enhanced Sessions

**Gap**: Session state doesn't track "context snapshot" or tool instance state.

**Proposed Adoption**:

```typescript
// Extend ChatSession with snapshot
interface ChatSession {
  id: string;
  sessionKey: string;
  conversation: Message[];
  contextSnapshot?: ContextSnapshot;  // New: serialized prompt + tools state
  toolStates: Map<string, any>;       // New: persisted tool state (e.g., grep results)
  metadata: SessionMetadata;
}
```

**Use case**: When resuming a session, restore context without re-querying.

**Implementation**: Serialize context on each turn, store in session file.

### 3.5 Hooks → Agent Middleware

**Gap**: No hook system for intercepting agent actions.

**Proposed Adoption**:

```typescript
// New: Hook registry in gateway
type HookPoint = 'before_spawn' | 'after_spawn' | 'before_message' | 'after_message' | 'before_tool' | 'after_tool';

interface Hook {
  point: HookPoint;
  skill?: string; // optional filter
  handler: (ctx: HookContext) => Promise<HookResult>;
}

// Example: audit log hook
{
  point: 'after_tool',
  handler: async (ctx) => {
    await logAuditEvent({
      sessionKey: ctx.sessionKey,
      tool: ctx.tool.name,
      params: ctx.tool.params,
      result: ctx.tool.result,
      timestamp: new Date().toISOString()
    });
    return { proceed: true };
  }
}
```

**Integration**: Hook into `openclaw sessions send` flow in gateway.

### 3.6 Services → Background Daemons

**Gap**: No managed background services.

**OpenClaw Fit**: Use `openclaw cron` for periodic jobs, but not long-running daemons.

**Proposed Adoption**:

```typescript
// New: Service manager in gateway
interface Service {
  name: string;
  command: string; // e.g., "openclaw skill-indexer"
  autoRestart: boolean;
}

// Control via: openclaw services start|stop|status
```

Use cases:
- File indexer for query engine
- Memory sync daemon
- Telemetry collector

### 3.7 Bridge → MCP Client

**Gap**: No MCP client integration.

**OpenClaw Strength**: Can implement MCP as a skill.

**Proposed Adoption**:

```typescript
// New: mcp-client skill
SKILL.md:
---
name: mcp-client
description: Connect to MCP servers and expose their tools as OpenClaw tools.
model: claude-3-7-sonnet
---

Workflow:
1. `mcp connect <server_url|stdio_path>` to establish connection
2. `mcp list-tools` to discover available tools
3. Tools become available for execution via `mcp call <tool> <args>`
4. Stream responses back to user
```

**Implementation**: Bridge skill acts as MCP client, registers discovered tools with the agent's tool registry.

---

## 4. Key Patterns to Adopt (Priority Order)

### Pattern 1: Unified Tool Contract

**Why**: LLMs need structured tool definitions for reliable invocation.

**Adopt from**: Claude Code Tool interface with Zod schemas.

**OpenClaw mapping**:
- Add `tools.json` alongside each SKILL.md defining:
  - `name`
  - `description`
  - `inputSchema` (Zod)
  - `outputSchema` (optional)
  - `permissions` (array)
- Agent runtime loads tools, validates params pre-execution, enforces permissions.

**Example**:

`skills/agent-read/tools.json`:
```json
{
  "tools": [
    {
      "name": "read",
      "description": "Read a file",
      "inputSchema": {
        "type": "object",
        "properties": { "path": { "type": "string" } },
        "required": ["path"]
      },
      "permissions": ["file_read"]
    }
  ]
}
```

**Benefit**: Tools become discoverable, testable, and permissioned.

### Pattern 2: Streaming Progress

**Why**: Long-running tools should stream updates (like `ripgrep` streaming matches).

**Adopt from**: Claude Code's `streamTool` and `TaskUpdate` patterns.

**OpenClaw mapping**:
- Extend tool `execute` to return `AsyncIterable<ToolChunk>` or `Promise<ToolResult>`.
- Gateway streams chunks over WebSocket to UI.
- UI renders progressive updates (e.g., "Found 5/100 files...").

**Implementation**:
```typescript
interface ToolChunk {
  type: 'progress' | 'partial' | 'complete';
  data: any;
  metadata?: Record<string, any>;
}

// Tool can yield chunks
async function* grepTool(params: { pattern: string; path: string }): AsyncIterable<ToolChunk> {
  const stream = ripgrepStream(params.pattern, params.path);
  for await (const match of stream) {
    yield { type: 'partial', data: match };
  }
  yield { type: 'complete', data: { count: stream.count } };
}
```

**Gateway**: Pipe AsyncIterable to WebSocket messages.

### Pattern 3: Permissions and Safety

**Why**: Prevent accidental destructive operations.

**Adopt from**: Claude Code's `Permission` enum and approval flow.

**OpenClaw mapping**:
- Existing `openclaw approvals` system is good but needs tool-level granularity.
- Extend permissions: `file_write`, `file_delete`, `shell_exec`, `network_request`, `git_push`.
- Tools declare required permissions.
- Agent checks before execution; if not approved, prompts via gateway.

**Implementation**:
```typescript
enum ToolPermission {
  FILE_READ = 'file_read',
  FILE_WRITE = 'file_write',
  FILE_DELETE = 'file_delete',
  SHELL_EXEC = 'shell_exec',
  GIT_PUSH = 'git_push',
  NETWORK = 'network',
}

// Before tool call
if (!permissionsApproved(sessionKey, tool.permissions)) {
  return {
    result: null,
    error: 'Permission denied. Approval required.',
    requiresApproval: true
  };
}
```

### Pattern 4: Context Assembly (Query Engine Lite)

**Why**: LLMs need relevant context without hitting token limits.

**Adopt from**: Claude Code's multi-source query.

**OpenClaw mapping**:
- Implement simple query service that:
  - Searches workspace files (rg)
  - Fetches relevant learnings (from `memory/` and `LEARNINGS.md`)
  - Gets recent git commits (last 5)
  - Combines with deduplication and truncation
- Run before agent prompt construction.
- Inject `<context>` block into system message.

**Example code**:
```typescript
async function assembleContext(query: string, maxTokens: number): Promise<string> {
  const pieces: string[] = [];

  // File search
  const files = await ripgrep(query, { maxResults: 5 });
  pieces.push('Relevant files:\n' + files.map(f => `- ${f.path}:${f.line}\n  ${f.snippet}`).join('\n'));

  // Learnings
  const learnings = await searchLearnings(query, 3);
  pieces.push('Related learnings:\n' + learnings.map(l => l.bullet).join('\n'));

  return truncateToTokens(pieces.join('\n'), maxTokens);
}
```

### Pattern 5: MCP Integration as Bridge

**Why**: Access external tools (GitHub, Notion, databases) without building custom integrations.

**Adopt from**: Claude Code's Bridge + MCP standard.

**OpenClaw mapping**:
- Build `openclaw-mcp` connector skill.
- Connect tostdio or SSE MCP servers.
- Register discovered tools dynamically.
- Stream tool results via existing activity system.

**CLI**:
```bash
openclaw mcp connect github --token $GITHUB_TOKEN
# Now skills like "search_github", "create_issue" available
```

**Implementation**: Use `@modelcontextprotocol/sdk` in a Node.js bridge.

---

## 5. Gaps and Implementation Plan

### Gap 1: No Structured Tool Definitions

**Impact**: Tools are implicit in skill instructions; no validation or discovery.

**Phase 1 (Weeks 1-2)**:
- Define tool JSON schema (`toolSchema.json`)
- Add tool registry to agent runtime
- Convert 5 most-used skills to structured tools (read, write, exec, search, git)
- Implement Zod validation in tool executor
- Update skill instructions to reference tool names

**Deliverable**: Tools work with `execute_tool` calls directly (no LLM parsing needed).

### Gap 2: No Streaming from Tools

**Impact**: Long-running operations block; poor UX.

**Phase 2 (Weeks 3-4)**:
- Extend tool interface to support `AsyncIterable<ToolChunk>`
- Modify gateway to stream chunks over WebSocket
- Update frontend trace viewer to handle progressive updates
- Convert `rg`, `git log`, and `read` to streaming if applicable
- Add heartbeats to avoid timeouts

**Deliverable**: Real-time streaming of tool output (e.g., `ripgrep` shows matches as found).

### Gap 3: No Context Query Engine

**Impact**: Agents manually decide what context to load; inefficient and inconsistent.

**Phase 3 (Weeks 5-6)**:
- Implement `QueryService` in backend
- Add `rg`-based file search with snippet extraction
- Integrate learnings search (from `LEARNINGS.md` and `memory/*.md`)
- Add git commit retrieval (last N commits)
- Create `before_turn` hook that runs query and injects into system prompt
- Tune relevance heuristics

**Deliverable**: Automatic context assembly with deduplication and truncation.

### Gap 4: No MCP Support

**Impact**: Can't integrate external tools easily.

**Phase 4 (Weeks 7-8)**:
- Create `mcp-client` skill using MCP SDK
- Implement stdio and SSE transports
- Add tool registration from MCP tools into agent tool registry
- Handle auth (OAuth, tokens) via config
- Test with GitHub MCP server, Filesystem MCP
- Document MCP server setup

**Deliverable**: Connect to any MCP server, use tools seamlessly.

### Gap 5: Limited Permission System

**Impact**: Tools require approvals but not granular per-tool.

**Phase 5 (Weeks 9-10)**:
- Define permission matrix (file_read, file_write, shell_exec, git_push, network)
- Add permission declarations to tools
- Extend approval workflow to show required permissions
- Implement session-level permission cache (approved once per session)
- Add `openclaw permissions` command to manage whitelist

**Deliverable**: Fine-grained security with user consent flows.

### Gap 6: No Task Orchestration

**Impact**: Complex tasks require manual breakdown.

**Phase 6 (Weeks 11-12)**:
- Create `orchestrator` skill
- Implement plan generation (LLM分解)
- Add task dependency tracking
- Use subagent sessions to run tasks (parallel via `spawnSession` with `Promise.all`)
- Stream task state updates to UI
- Handle retries and error recovery

**Deliverable**: High-level goals decomposed into automated subtasks.

---

## 6. Risks and Legal Considerations

### 6.1 Clean-Room Approach

**Risk**: The leaked Claude Code spec is proprietary to Anthropic. Direct copying could violate intellectual property.

**Mitigation**:
- **Do not copy** code verbatim from leaked docs.
- Use **public information** only (Anthropic blog, MCP open standard, official docs).
- **Independently implement** patterns with original code.
- Cite sources: MCP spec (Apache 2.0), general AI agent patterns.
- Consult legal before releasing features that mimic Claude Code too closely.

### 6.2 Patent Risks

**Risk**: Some Claude Code features may be patented (e.g., streaming tool execution, query engine).

**Mitigation**:
- Prior art search for key patterns.
- Design around known patents (e.g., implement differently: use AsyncIterable vs SSE).
- Add disclaimers: "Inspired by Claude Code, independently implemented."

### 6.3 MCP License Compliance

**Opportunity**: MCP is open-source (Apache 2.0) — safe to adopt.

**Action**: Use `@modelcontextprotocol/sdk` directly; comply with Apache 2.0 (include NOTICE).

### 6.4 User Data Privacy

**Risk**: Query engine indexing user files could expose sensitive data.

**Mitigation**:
- Index only file paths and small snippets (not full files) unless explicitly requested.
- Encrypt index at rest.
- Allow opt-out via `.openclawignore`.
- Regular audits of indexed content.

---

## 7. Recommended Next Steps

1. **Start Phase 1** (Unified Tool Contract) — highest ROI, foundation for others.
2. **Set up MCP SDK** in a sandbox to prototype Bridge.
3. **Audit current skills** to identify candidates for structured conversion.
4. **Create design doc** for tool registry API and get team feedback.
5. **Check licensing** for any third-party components (Zod, MCP SDK).

---

## Appendix: TypeScript Type Definitions

```typescript
// Core tool types
export type ToolPermission = 
  | 'file_read' | 'file_write' | 'file_delete'
  | 'shell_exec' | 'git_push' | 'network'
  | 'memory_write' | 'session_delete';

export interface OpenClawTool<TInput = any, TOutput = any> {
  name: string;
  description: string;
  inputSchema: z.ZodType<TInput>;
  outputSchema?: z.ZodType<TOutput>;
  permissions: ToolPermission[];
  execute: (params: TInput, ctx: ToolContext) => Promise<ToolResult<TOutput>> | AsyncIterable<ToolChunk<TOutput>>;
}

export interface ToolContext {
  sessionKey: string;
  workspaceRoot: string;
  user: UserIdentity;
}

export interface ToolResult<T = any> {
  result?: T;
  error?: string;
  truncated?: boolean;
  metadata?: Record<string, any>;
  requiresApproval?: boolean;
}

export interface ToolChunk<T = any> {
  type: 'progress' | 'partial' | 'complete';
  data: T | ToolProgress;
  metadata?: Record<string, any>;
}

export interface ToolProgress {
  percent?: number;
  message?: string;
  itemsProcessed?: number;
  totalItems?: number;
}

// Query engine
export interface QuerySource = 'files' | 'memory' | 'recent_commits' | 'learnings';

export interface QueryResult {
  source: string;
  content: string;
  relevance: number;
  metadata: { path?: string; line?: number; tags?: string[] };
}

// Hook system
export type HookPoint = 
  | 'before_spawn' | 'after_spawn'
  | 'before_message' | 'after_message'
  | 'before_tool' | 'after_tool';

export interface HookContext {
  sessionKey: string;
  point: HookPoint;
  message?: Message;
  tool?: { name: string; params: any };
  result?: any;
}

export interface HookHandler {
  (ctx: HookContext): Promise<HookResponse>;
}

export interface HookResponse {
  proceed: boolean;
  modifiedParams?: any;
  modifiedResult?: any;
  abortReason?: string;
}

// Task orchestration
export interface TaskPlan {
  id: string;
  goal: string;
  tasks: Task[];
  createdAt: string;
}

export interface Task {
  id: string;
  description: string;
  skill: string;
  dependsOn: string[];
  priority: 'low' | 'medium' | 'high';
  maxRetries: number;
}

export type TaskState = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface TaskUpdate {
  taskId: string;
  state: TaskState;
  progress?: number;
  result?: any;
  error?: string;
  timestamp: string;
}
```

---

## Conclusion

OpenClaw is well-positioned to adopt Claude Code's best patterns:

- **Foundation**: Skills, sessions, gateway, streaming already exist.
- **Missing pieces**: Structured tools, query engine, MCP bridge, hooks.
- **Implementation**: 6 phases over 12 weeks incremental rollout.
- **Risk**: Clean-room design essential; avoid direct copying.

By adopting these patterns, OpenClaw will leapfrog Claude Code in flexibility (custom skills) while matching its power (tool contracts, streaming, query).

**Next milestone**: Prototype unified tool contract in `agent-read` skill.
