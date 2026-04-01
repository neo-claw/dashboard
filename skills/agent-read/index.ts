import { z } from 'zod';
import { createReadStream } from 'fs';
import { readdir, stat, readFile } from 'fs/promises';
import { join, resolve } from 'path';
import type { ToolChunk } from '@/shared/types';

// Helper to ensure path is within workspace? For safety, restrict to allowed dirs.
const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || process.cwd();

// Zod Schemas
export const readSchema = z.object({
  path: z.string(),
  stream: z.boolean().optional().default(false),
});

export const listDirSchema = z.object({
  path: z.string(),
});

// Tool implementations
export async function read(params: { path: string; stream?: boolean }, ctx: any): Promise<any | AsyncIterable<ToolChunk>> {
  const fullPath = resolve(WORKSPACE_ROOT, params.path);

  // Basic safety: ensure the path is within workspace
  if (!fullPath.startsWith(WORKSPACE_ROOT)) {
    throw new Error('Access denied: path outside workspace');
  }

  if (params.stream) {
    // Stream file in chunks
    const stream = createReadStream(fullPath);
    const chunks: string[] = [];
    let totalSize = 0;

    return {
      async *[Symbol.asyncIterator]() {
        try {
          for await (const chunk of stream) {
            chunks.push(chunk.toString());
            totalSize += chunk.length;
            yield { type: 'partial', data: chunk.toString() };
          }
          const fullContent = chunks.join('');
          yield { type: 'complete', data: fullContent };
        } catch (err: any) {
          yield { type: 'complete', error: err.message };
        }
      },
    };
  } else {
    // Read entire file
    try {
      const content = await readFile(fullPath, 'utf-8');
      return { success: true, result: content };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

export async function list_dir(params: { path: string }, ctx: any): Promise<any> {
  const fullPath = resolve(WORKSPACE_ROOT, params.path);
  if (!fullPath.startsWith(WORKSPACE_ROOT)) {
    throw new Error('Access denied: path outside workspace');
  }
  try {
    const entries = await readdir(fullPath, { withFileTypes: true });
    const items = await Promise.all(
      entries.map(async (entry) => {
        const entryPath = join(fullPath, entry.name);
        const stats = await stat(entryPath);
        return {
          name: entry.name,
          isDirectory: entry.isDirectory(),
          size: stats.size,
          modified: stats.mtime.toISOString(),
        };
      })
    );
    return { success: true, result: items };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Export tools registry for this skill
export const tools = {
  read: {
    name: 'read',
    description: 'Read a file\'s contents, with optional streaming for large files.',
    skill: 'agent-read',
    permissions: ['file_read'],
    inputSchema: readSchema,
    execute: read,
  },
  list_dir: {
    name: 'list_dir',
    description: 'List files and directories in a given path.',
    skill: 'agent-read',
    permissions: ['file_read'],
    inputSchema: listDirSchema,
    execute: list_dir,
  },
};