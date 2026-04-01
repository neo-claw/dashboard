# Query Engine

Automatic context assembly that searches your workspace files, memory notes, and recent git commits to enrich the agent's prompt before each turn.

## Configuration

The query engine can be configured via the Admin UI (Settings > Query Engine) or by editing `config/query.json`.

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable or disable the query engine globally. |
| `sources` | string[] | `["files","memory","git"]` | List of sources to query. Available: `files`, `memory`, `git`. |
| `limit` | number | `10` | Maximum number of results to include per turn. |
| `maxTokens` | number | `2000` | Approximate token budget for the assembled context (1 token ≈ 4 characters). |
| `injectAsSystem` | boolean | `false` | If `true`, context is added to the system prompt; if `false`, it is prepended to the user message. |

## How It Works

1. The query engine hooks into the `before_prompt_build` phase of the agent loop.
2. For each user message, it performs searches across the selected sources:
   - **Files**: Uses `ripgrep` to find content matches within the workspace.
   - **Memory**: Scans `MEMORY.md` and daily notes in the `memory/` directory for bullet points that contain query keywords.
   - **Git**: Retrieves commit messages from the last 7 days and matches them against the query.
3. Results are deduplicated by file path (for files) or commit hash (for git).
4. Results are sorted by relevance (files highest, memory medium, git lowest).
5. The combined context is formatted with source tags and truncated to fit the token budget.
6. The formatted context is injected either into the system prompt or prepended to the user message based on `injectAsSystem`.

## API

### Backend Endpoints

- `GET /api/v1/query/config` - Retrieve current configuration (or defaults if none).
- `POST /api/v1/query/config` - Update configuration. Requires backend API key.

### Example Response from Search (internal)

The plugin uses the `QueryService` class. It returns an array of `QueryResult`:

```typescript
interface QueryResult {
  source: string;   // 'files' | 'memory' | 'git'
  content: string;  // snippet or line
  relevance: number;
  metadata?: {
    path?: string;
    line?: number;
    commitId?: string;
  };
}
```

## Tuning

- **Performance**: File search uses `rg`, which is fast on large codebases. If you notice slowdown, consider reducing the `limit` or disabling the `files` source.
- **Relevance**: The relevance scores are fixed. Future versions may include TF-IDF or embedding-based ranking.
- **Memory Search**: Only bullet-point lines (starting with `- `) are considered. This avoids noise.
- **Git Search**: Limited to the last 7 days of commits. Adjust the time window in the source code if needed.

## Troubleshooting

If the query engine seems inactive:
- Ensure `enabled` is `true` in the configuration.
- Check that the `before_prompt_build` hook is registered (the plugin loads on startup).
- Verify that the plugin has permissions to run `rg` and `git` commands.
- Look at gateway logs for errors during query execution.

You can also use the Playwright test `query-engine.spec.ts` to verify end-to-end functionality.
