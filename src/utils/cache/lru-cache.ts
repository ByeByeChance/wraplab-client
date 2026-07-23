/**
 * LRU (Least Recently Used) 淘汰算法实现
 */
export class LRUCache<K, V extends { lastAccessedAt: number }> {
  private capacity: number;
  private currentSize: number;
  private map: Map<K, V>;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.currentSize = 0;
    this.map = new Map();
  }

  get(key: K): V | undefined {
    const value = this.map.get(key);
    if (value) {
      value.lastAccessedAt = Date.now();
    }
    return value;
  }

  put(key: K, value: V, size: number): void {
    if (this.map.has(key)) {
      this.currentSize -= this.getEntrySize(this.map.get(key));
      this.map.delete(key);
    }

    while (this.currentSize + size > this.capacity && this.map.size > 0) {
      this.evict();
    }

    this.map.set(key, value);
    this.currentSize += size;
  }

  delete(key: K): boolean {
    const value = this.map.get(key);
    if (value) {
      this.currentSize -= this.getEntrySize(value);
    }
    return this.map.delete(key);
  }

  evict(): void {
    let oldestKey: K | null = null;
    let oldestTime = Infinity;

    this.map.forEach((value, key) => {
      if (value.lastAccessedAt < oldestTime) {
        oldestTime = value.lastAccessedAt;
        oldestKey = key;
      }
    });

    if (oldestKey !== null) {
      const value = this.map.get(oldestKey);
      if (value) {
        this.currentSize -= this.getEntrySize(value);
      }
      this.map.delete(oldestKey);
    }
  }

  getCurrentSize(): number {
    return this.currentSize;
  }

  private getEntrySize(value: V | undefined): number {
    if (!value) return 0;
    return JSON.stringify(value).length;
  }
}
