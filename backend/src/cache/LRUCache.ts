interface CacheEntry<V> {
  value: V;
  expiresAt: number; // ms since epoch
}

export class LRUCache<K extends string | number | symbol, V> {
  private capacity: number;
  private ttlMs: number;
  private cache: Map<K, CacheEntry<V>> = new Map();

  constructor(options: { capacity?: number; ttlMs?: number } = {}) {
    this.capacity = options.capacity ?? 100;
    this.ttlMs = options.ttlMs ?? 60_000; // 1 minute default
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    const now = Date.now();
    if (entry.expiresAt < now) {
      this.cache.delete(key);
      return undefined;
    }
    // Refresh LRU ordering
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V): void {
    this.evictIfNeeded();
    const expiresAt = Date.now() + this.ttlMs;
    this.cache.set(key, { value, expiresAt });
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private evictIfNeeded(): void {
    if (this.cache.size >= this.capacity) {
      // Least-recently used: first key in map (since we delete and re-set on get)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
  }

  // For debugging/metrics
  stats(): { size: number; hits: number; misses: number } {
    // We'll require external counters if needed; simple version just size
    return { size: this.cache.size, hits: 0, misses: 0 };
  }
}
