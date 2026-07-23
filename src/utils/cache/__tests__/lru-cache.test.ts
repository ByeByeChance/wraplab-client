import { LRUCache } from '../lru-cache';

interface TestEntry {
  lastAccessedAt: number;
  value: string;
}

describe('LRUCache', () => {
  let cache: LRUCache<string, TestEntry>;

  beforeEach(() => {
    cache = new LRUCache(1024); // 1KB capacity
  });

  it('stores and retrieves values', () => {
    const entry: TestEntry = { lastAccessedAt: Date.now(), value: 'test' };
    cache.put('key1', entry, 100);
    expect(cache.get('key1')).toEqual(entry);
  });

  it('returns undefined for missing keys', () => {
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('updates lastAccessedAt on get', () => {
    const now = Date.now();
    const entry: TestEntry = { lastAccessedAt: now - 10000, value: 'test' };
    cache.put('key1', entry, 50);

    const retrieved = cache.get('key1');
    expect(retrieved!.lastAccessedAt).toBeGreaterThanOrEqual(now);
  });

  it('evicts oldest entry when over capacity', () => {
    // Each entry ~200 bytes, capacity 1024 bytes => 5 entries max
    const entries: TestEntry[] = [];
    for (let i = 0; i < 10; i++) {
      const entry: TestEntry = { lastAccessedAt: Date.now() + i, value: `value-${i}` };
      entries.push(entry);
      cache.put(`key${i}`, entry, 200);
    }

    // Oldest should be evicted
    expect(cache.get('key0')).toBeUndefined();
    expect(cache.get('key1')).toBeUndefined();
    // Newer entries should remain
    expect(cache.get('key9')).toBeDefined();
  });

  it('deletes entries correctly', () => {
    const entry: TestEntry = { lastAccessedAt: Date.now(), value: 'test' };
    cache.put('key1', entry, 200);

    expect(cache.delete('key1')).toBe(true);
    expect(cache.get('key1')).toBeUndefined();
    expect(cache.delete('nonexistent')).toBe(false);
  });

  it('replaces existing key', () => {
    const entry1: TestEntry = { lastAccessedAt: Date.now(), value: 'first' };
    const entry2: TestEntry = { lastAccessedAt: Date.now(), value: 'second' };
    cache.put('key1', entry1, 100);
    cache.put('key1', entry2, 100);

    expect(cache.get('key1')!.value).toBe('second');
  });

  it('tracks current size correctly', () => {
    expect(cache.getCurrentSize()).toBe(0);

    const entry: TestEntry = { lastAccessedAt: Date.now(), value: 'test' };
    cache.put('key1', entry, 200);
    expect(cache.getCurrentSize()).toBeGreaterThan(0);

    cache.delete('key1');
    expect(cache.getCurrentSize()).toBeLessThan(200);
  });

  it('manually evicts oldest entry', () => {
    const entry1: TestEntry = { lastAccessedAt: 1000, value: 'old' };
    const entry2: TestEntry = { lastAccessedAt: 2000, value: 'new' };
    cache.put('key1', entry1, 100);
    cache.put('key2', entry2, 100);

    cache.evict();

    expect(cache.get('key1')).toBeUndefined();
    expect(cache.get('key2')).toBeDefined();
  });
});
