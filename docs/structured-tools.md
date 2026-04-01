# Structured Tools

## Overview

Structured tools allow skills to define typed, validated tool calls that the agent can execute directly with parameter validation and permission checks. This replaces the previous natural language tool parsing approach, providing better reliability and security.

## Tool Definition

A skill can define tools by adding a `tools.json` file and an `index.ts` that exports tool implementations.

### tools.json

The `tools.json` file declares the tool metadata:

```json
{
  "tools": [
    {
      "name": "read",
      "description": "Read a file's contents, with optional streaming for large files.",
      "skill": "agent-read",
      "permissions": ["file_read"],
      "inputSchema": {
        "type": "object",
        "properties": {
          "path": { "type": "string" },
          "stream": { "type": "boolean", "default": false }
        },
        "required": ["path"]
      }
    }
  ]
}
```

- `name`: Tool name used in agent calls.
- `description`: Human-readable description.
- `skill`: The skill ID (must match the skill directory name).
- `permissions`: Array of required permissions (e.g., `file_read`, `shell_exec`).
- `inputSchema`: JSON Schema for the input parameters.
- `outputSchema` (optional): JSON schema for the output.

### index.ts

The `index.ts` must export a `tools` object where each tool includes the Zod schema and execute function:

```ts
import { z } from 'zod';
import { readFile } from 'fs/promises';

// Zod schema for validation (must match tools.json inputSchema shape)
export const readSchema = z.object({
  path: z.string(),
  stream: z.boolean().optional().default(false),
});

// Tool implementation
export async function read(params: { path: string; stream?: boolean }, ctx: any) {
  // Implementation
  if (params.stream) {
    // Return an AsyncIterable for streaming
    return {
      async *[Symbol.asyncIterator]() {
        // yield chunks: { type: 'partial', data: string } or { type: 'complete', data: string }
      },
    };
  } else {
    const content = await readFile(params.path, 'utf-8');
    return { success: true, result: content };
  }
}

// Export tools registry
export const tools = {
  read: {
    name: 'read',
    description: 'Read a file\'s contents, with optional streaming for large files.',
    skill: 'agent-read',
    permissions: ['file_read'],
    inputSchema: readSchema,
    execute: read,
  },
};
```

**Notes:**

- The `inputSchema` field should be a Zod schema object (not JSON Schema). The gateway uses Zod to validate parameters before execution.
- The `execute` function receives two arguments: `params` (validated) and `ctx` (the execution context, may include session info).
- If the tool returns an `AsyncIterable`, the gateway will stream chunks to the UI in real-time.
- Permissions must be declared and the user must approve them for the session.

## Registration

The `compound-engineering` extension automatically scans all skills and registers any tools it finds. No further action is required. The extension loads tools at startup.

To register your own skills with tools, ensure:

1. Skill directory exists under `skills/` (or under `.openclaw/extensions/compound-engineering/skills/`).
2. The directory contains both `tools.json` and `index.ts`.
3. The `index.ts` exports a `tools` object with tool definitions.

After adding new tools, restart the gateway (`openclaw gateway restart`) to reload the plugin.

## API

The backend provides `GET /api/v1/tools` to list all available tools. This can be used by frontend components to display available capabilities.

Optional query parameter `skill` filters to a specific skill.

Example:

```bash
curl http://localhost:3001/api/v1/tools
```

Response:

```json
{
  "tools": [
    {
      "name": "read",
      "description": "Read a file's contents...",
      "skill": "agent-read",
      "permissions": ["file_read"],
      "inputSchema": { ... }
    }
  ]
}
```

## Permissions

When a tool requires permissions, the gateway will check the session's approval state. If permissions are missing, an approval request will be triggered. The UI will show the required permissions in the approval dialog.

## Backward Compatibility

Skills without `tools.json` continue to work via the natural language parsing fallback. Existing skills remain unaffected.

## Testing

After implementing a tool, you can test it by:

1. Ensuring the tool appears in `/api/v1/tools`.
2. Sending a chat message that would trigger the tool (e.g., "Read the README").
3. Observing the trace viewer to see the tool call with input params and the result.
4. For streaming tools, verify that chunks arrive incrementally in the trace.

Additional Playwright tests are located in `tests/tool-registry-api.spec.ts` and `tests/tool-contract-ui.spec.ts`.