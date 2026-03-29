import { promises as fs } from 'fs';
import path from 'path';
import { sha1 } from '../utils';

export interface IndexMeta {
  path: string;
  mtime: number;
  checksum?: string;
  indexedAt: number;
  rowCount: number;
}

type Parser<T> = (content: string) => T[];

class FileIndexer<T> {
  private metaPath: string;
  private parser: Parser<T>;
  private dbUpsert: (items: T[]) => Promise<void>;
  private cacheInvalidate?: (key: string) => void;
  private pending = new Map<string, Promise<void>>();

  constructor(options: {
    metaPath: string;
    parser: Parser<T>;
    dbUpsert: (items: T[]) => Promise<void>;
    cacheInvalidate?: (key: string) => void;
  }) {
    this.metaPath = options.metaPath;
    this.parser = options.parser;
    this.dbUpsert = options.dbUpsert;
    this.cacheInvalidate = options.cacheInvalidate;
  }

  async ensureFresh(filePath: string): Promise<void> {
    // Deduplicate concurrent calls
    let pending = this.pending.get(filePath);
    if (pending) {
      return pending;
    }
    pending = this._ensureFresh(filePath);
    this.pending.set(filePath, pending);
    try {
      await pending;
    } finally {
      this.pending.delete(filePath);
    }
  }

  private async _ensureFresh(filePath: string): Promise<void> {
    try {
      await fs.access(filePath);
    } catch {
      // File missing; treat as empty
      return;
    }

    const stat = await fs.stat(filePath);
    const currentMtime = stat.mtimeMs;
    const meta = await this.readMeta();

    const currentMeta = meta[filePath];
    const contentHash = await this.computeChecksum(filePath);

    const needsReindex =
      !currentMeta ||
      currentMeta.mtime < currentMtime ||
      (currentMeta.checksum && currentMeta.checksum !== contentHash);

    if (!needsReindex) {
      return; // up to date
    }

    // Reindex
    const content = await fs.readFile(filePath, 'utf-8');
    const items = this.parser(content);
    await this.dbUpsert(items);

    // Update meta
    meta[filePath] = {
      path: filePath,
      mtime: currentMtime,
      checksum: contentHash,
      indexedAt: Date.now(),
      rowCount: items.length,
    };
    await this.writeMeta(meta);

    // Invalidate related cache entries
    if (this.cacheInvalidate) {
      this.cacheInvalidate(filePath);
    }
  }

  private async readMeta(): Promise<Record<string, IndexMeta>> {
    try {
      const data = await fs.readFile(this.metaPath, 'utf-8');
      return JSON.parse(data);
    } catch (err) {
      if (err.code === 'ENOENT') return {};
      throw err;
    }
  }

  private async writeMeta(meta: Record<string, IndexMeta>): Promise<void> {
    await fs.mkdir(path.dirname(this.metaPath), { recursive: true });
    await fs.writeFile(this.metaPath, JSON.stringify(meta, null, 2), 'utf-8');
  }

  private async computeChecksum(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath, 'utf-8');
    return sha1(content);
  }
}

export function createIndexer<T>(options: {
  metaPath: string;
  parser: Parser<T>;
  dbUpsert: (items: T[]) => Promise<void>;
  cacheInvalidate?: (key: string) => void;
}): FileIndexer<T> {
  return new FileIndexer(options);
}
