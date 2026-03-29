import { LRUCache } from '../cache/LRUCache';

describe('LRUCache', () => {
  it('should store and retrieve values within TTL', () => {
    const cache = new LRUCache<string, number>({ capacity: 2, ttlMs: 1000 });
    cache.set('a', 1);
    expect(cache.get('a')).toBe(1);
  });

  it('should evict expired entries', async () => {
    const cache = new LRUCache<string, number>({ capacity: 10, ttlMs: 50 });
    cache.set('x', 123);
    await new Promise(res => setTimeout(res, 100));
    expect(cache.get('x')).toBeUndefined();
  });

  it('should respect capacity limit', () => {
    const cache = new LRUCache<string, number>({ capacity: 2 });
    cache.set('1', 1);
    cache.set('2', 2);
    cache.set('3', 3); // evicts oldest (1)
    expect(cache.get('1')).toBeUndefined();
    expect(cache.get('2')).toBe(2);
    expect(cache.get('3')).toBe(3);
  });

  it('should refresh LRU order on get', () => {
    const cache = new LRUCache<string, number>({ capacity: 2 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a'); // refresh a
    cache.set('c', 3); // should evict b (least recently used)
    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('c')).toBe(3);
  });

  it('should allow deletion', () => {
    const cache = new LRUCache<string, number>();
    cache.set('only', 42);
    expect(cache.delete('only')).toBe(true);
    expect(cache.get('only')).toBeUndefined();
    expect(cache.delete('nonexistent')).toBe(false);
  });

  it('should clear all entries', () => {
    const cache = new LRUCache<string, number>();
    cache.set('x', 1);
    cache.set('y', 2);
    cache.clear();
    expect(cache.get('x')).toBeUndefined();
    expect(cache.get('y')).toBeUndefined();
  });
});
