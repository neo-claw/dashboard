import { exec } from 'child_process';
import { promisify } from 'util';
import { readdir, readFile, mkdir } from 'fs/promises';
import { join, relative, dirname } from 'path';

const execAsync = promisify(exec);

export interface QueryResult {
  source: string;
  content: string;
  relevance: number;
  metadata?: {
    path?: string;
    line?: number;
    commitId?: string;
  };
}

export interface QueryConfig {
  enabled: boolean;
  sources: string[];
  limit: number;
  maxTokens?: number;
  injectAsSystem?: boolean;
}

export class QueryService {
  async search(root: string, query: string, config: QueryConfig): Promise<QueryResult[]> {
    if (!config.enabled) return [];

    const allResults: QueryResult[] = [];
    const queryLower = query.toLowerCase();

    // File search using ripgrep
    if (config.sources.includes('files')) {
      try {
        const { stdout } = await execAsync(`rg --line-number --no-heading --context 2 ${this.escapeQuery(query)}`, {
          cwd: root,
          maxBuffer: 10 * 1024 * 1024, // 10MB
        });
        const lines = stdout.split('\n').filter((line) => line.trim() !== '');
        const seenFiles = new Set<string>();
        for (const line of lines) {
          const match = this.parseRgLine(line);
          if (match && !seenFiles.has(match.path)) {
            seenFiles.add(match.path);
            allResults.push({
              source: 'files',
              content: `[${match.path}:${match.line}] ${match.snippet}`,
              relevance: 0.9,
              metadata: { path: match.path, line: match.line },
            });
            if (config.limit && allResults.length >= config.limit * 3) break;
          }
        }
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          console.error('QueryService rg error:', err.message);
        }
      }
    }

    // Memory search (memory/*.md and MEMORY.md)
    if (config.sources.includes('memory')) {
      try {
        const memoryPath = join(root, 'MEMORY.md');
        await this.searchMemoryFile(memoryPath, queryLower, allResults, root);
      } catch (err: any) {
        // ignore if file missing
      }
      try {
        const memoryDir = join(root, 'memory');
        const files = await readdir(memoryDir);
        for (const file of files) {
          if (!/^\d{4}-\d{2}-\d{2}\.md$/.test(file)) continue;
          const filePath = join(memoryDir, file);
          await this.searchMemoryFile(filePath, queryLower, allResults, root);
        }
      } catch (err: any) {
        // ignore if dir missing
      }
    }

    // Git search (last 7 days)
    if (config.sources.includes('git')) {
      try {
        const { stdout } = await execAsync('git log --since="7 days ago" --oneline --all', {
          cwd: root,
          maxBuffer: 10 * 1024 * 1024,
        });
        const lines = stdout.split('\n').filter(Boolean);
        for (const line of lines) {
          const match = line.match(/^([0-9a-f]+)\s+(.+)$/);
          if (match) {
            const commitId = match[1];
            const message = match[2];
            if (queryLower.length === 0 || message.toLowerCase().includes(queryLower)) {
              allResults.push({
                source: 'git',
                content: `[commit ${commitId}] ${message}`,
                relevance: 0.5,
                metadata: { commitId },
              });
              if (config.limit && allResults.length >= config.limit * 3) break;
            }
          }
        }
      } catch (err: any) {
        // ignore if git not available or not a repo
      }
    }

    // Sort by relevance descending
    allResults.sort((a, b) => b.relevance - a.relevance);

    // Apply limit
    const limited = allResults.slice(0, config.limit);

    // Token-aware truncation
    if (config.maxTokens && config.maxTokens > 0) {
      const maxChars = config.maxTokens * 4; // rough estimate
      let totalChars = 0;
      for (let i = 0; i < limited.length; i++) {
        const result = limited[i];
        const contentLen = result.content.length;
        if (totalChars + contentLen > maxChars) {
          const allowed = maxChars - totalChars;
          if (allowed > 20) {
            result.content = result.content.substring(0, allowed) + '...';
          } else {
            limited.splice(i);
            break;
          }
        }
        totalChars += result.content.length;
      }
    }

    return limited;
  }

  private escapeQuery(query: string): string {
    // Escape double quotes for shell
    return `"${query.replace(/"/g, '\\"')}"`;
  }

  private parseRgLine(line: string): { path: string; line: number; snippet: string } | null {
    const firstColon = line.indexOf(':');
    if (firstColon === -1) return null;
    const secondColon = line.indexOf(':', firstColon + 1);
    if (secondColon === -1) return null;
    const path = line.substring(0, firstColon);
    const lineStr = line.substring(firstColon + 1, secondColon);
    const snippet = line.substring(secondColon + 1);
    const lineNum = Number(lineStr);
    if (isNaN(lineNum)) return null;
    return { path, line: lineNum, snippet };
  }

  private async searchMemoryFile(
    filePath: string,
    queryLower: string,
    results: QueryResult[],
    workspaceRoot: string
  ): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('- ') && trimmed.toLowerCase().includes(queryLower)) {
          const text = trimmed.substring(2).trim();
          const relPath = relative(workspaceRoot, filePath);
          results.push({
            source: 'memory',
            content: `[${relPath}] ${text}`,
            relevance: 0.7,
            metadata: { path: filePath },
          });
          if (results.length > 100) return; // cap per file to avoid explosion
        }
      }
    } catch (err) {
      // ignore read errors
    }
  }
}
