interface CacheEntry<V> {
  value: V;
  expiresAt: number;
}

export function createCache<V>(ttlMs: number = 300_000, capacity: number = 10): {
  get: (key: string) => V | undefined;
  set: (key: string, value: V) => void;
  clear: () => void;
} {
  const cache = new Map<string, CacheEntry<V>>();

  return {
    get(key: string): V | undefined {
      const entry = cache.get(key);
      if (!entry) return undefined;
      const now = Date.now();
      if (entry.expiresAt < now) {
        cache.delete(key);
        return undefined;
      }
      // Refresh LRU (delete and re-set)
      cache.delete(key);
      cache.set(key, entry);
      return entry.value;
    },
    set(key: string, value: V): void {
      if (cache.size >= capacity) {
        const firstKey = cache.keys().next().value;
        if (firstKey !== undefined) cache.delete(firstKey);
      }
      cache.set(key, { value, expiresAt: Date.now() + ttlMs });
    },
    clear(): void {
      cache.clear();
    },
  };
}
