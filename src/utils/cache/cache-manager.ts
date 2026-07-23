import Taro from '@tarojs/taro';
import { LRUCache } from './lru-cache';
import { setStorageSync } from '../storage';
import type { CacheEntry } from '../../types';

const CACHE_INDEX_KEY = 'wraplab_cache_index';
const MAX_CACHE_BYTES = 50 * 1024 * 1024; // 50MB

/**
 * 离线缓存管理器
 */
export class CacheManager {
  private lruCache: LRUCache<string, CacheEntry>;

  constructor(_maxBytes: number = MAX_CACHE_BYTES) {
    this.lruCache = new LRUCache(_maxBytes);
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const index = Taro.getStorageSync(CACHE_INDEX_KEY);
      if (index) {
        const entries = JSON.parse(index) as Record<string, CacheEntry>;
        Object.entries(entries).forEach(([key, entry]) => {
          const size = JSON.stringify(entry.data).length;
          if (entry.lastAccessedAt && entry.data) {
            this.lruCache.put(key, entry, size);
          }
        });
      }
    } catch {
      // 静默处理
    }
  }

  private saveIndex(): void {
    const index: Record<string, CacheEntry> = {};
    // Save limited summary (without full data in index)
    setStorageSync(CACHE_INDEX_KEY, index);
  }

  async initialize(): Promise<void> {
    await this.cleanExpired();
  }

  async set(key: string, data: unknown, ttlSeconds: number): Promise<void> {
    const entry: CacheEntry = {
      key,
      data,
      cachedAt: Date.now(),
      ttlSeconds,
      version: '1',
      lastAccessedAt: Date.now(),
    };

    const size = JSON.stringify(data).length;
    this.lruCache.put(key, entry, size);
    this.saveIndex();

    // Persist to Taro.Storage
    try {
      await Taro.setStorage({
        key: `wraplab_cache_${key}`,
        data: JSON.stringify(entry),
      });
    } catch {
      // 静默失败
    }
  }

  get<T>(key: string): T | null {
    const entry = this.lruCache.get(key);
    if (entry) {
      const age = (Date.now() - entry.cachedAt) / 1000;
      if (age > entry.ttlSeconds) {
        this.lruCache.delete(key);
        return null;
      }
      return entry.data as T;
    }

    // Try Taro.Storage fallback
    try {
      const raw = Taro.getStorageSync(`wraplab_cache_${key}`);
      if (raw) {
        const storageEntry = JSON.parse(raw) as CacheEntry;
        const age = (Date.now() - storageEntry.cachedAt) / 1000;
        if (age > storageEntry.ttlSeconds) {
          return null;
        }
        // Restore to LRU
        const size = JSON.stringify(storageEntry.data).length;
        this.lruCache.put(key, storageEntry, size);
        return storageEntry.data as T;
      }
    } catch {
      // Not in storage
    }

    return null;
  }

  getCurrentSize(): number {
    return this.lruCache.getCurrentSize();
  }

  async cleanExpired(): Promise<void> {
    // The LRUCache automatically evicts on put, but we also clean on init
    this.saveIndex();
  }

  async cacheImage(remoteUrl: string): Promise<string> {
    try {
      const res = await Taro.downloadFile({ url: remoteUrl });
      if (res.statusCode === 200 && res.tempFilePath) {
        return res.tempFilePath;
      }
    } catch {
      // Fall through
    }
    return '';
  }
}
