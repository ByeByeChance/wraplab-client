import { create } from 'zustand';
import { getManifest } from '../services/offline.service';
import { setStorage, getStorageSync, setStorageSync } from '../utils/storage';
import type { CacheEntry, SyncOperation, ManifestResource } from '../types';

const OFFLINE_STORAGE_KEY = 'wraplab_offline_state';
const FIRST_OFFLINE_KEY = 'wraplab_first_offline';
const MAX_CACHE_BYTES = 50 * 1024 * 1024; // 50MB

interface OfflineState {
  isOffline: boolean;
  isRecovering: boolean;
  isFirstOffline: boolean;
  manifestGeneratedAt: string;
  manifestIsFull: boolean;
  manifestResources: ManifestResource[];
  cachedResources: Record<string, CacheEntry>;
  syncQueue: SyncOperation[];
  cacheSizeBytes: number;
  cacheMaxBytes: number;
  imageCacheMap: Record<string, string>;

  setOffline: (offline: boolean) => void;
  setRecovering: () => void;
  dismissFirstOfflineGuide: () => void;
  loadManifest: () => Promise<void>;
  cacheResource: (key: string, data: unknown, ttlSeconds: number) => Promise<void>;
  getCachedData: <T>(key: string) => T | null;
  enqueueSync: (operation: SyncOperation) => void;
  flushSyncQueue: () => Promise<void>;
  evictLRU: () => Promise<void>;
  cleanExpired: () => Promise<void>;
  getCacheUsage: () => number;
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
  isOffline: false,
  isRecovering: false,
  isFirstOffline: getStorageSync<boolean>(FIRST_OFFLINE_KEY) !== false,
  manifestGeneratedAt: '',
  manifestIsFull: false,
  manifestResources: [],
  cachedResources: {},
  syncQueue: [],
  cacheSizeBytes: 0,
  cacheMaxBytes: MAX_CACHE_BYTES,
  imageCacheMap: {},

  setOffline: (offline: boolean) => {
    if (offline) {
      const wasFirst = getStorageSync<boolean>(FIRST_OFFLINE_KEY);
      if (wasFirst === null || wasFirst === true) {
        set({ isFirstOffline: true });
      }
    }
    set({ isOffline: offline });
  },

  setRecovering: () => {
    set({ isRecovering: true });
    setTimeout(() => {
      set({ isRecovering: false });
    }, 2000);
  },

  dismissFirstOfflineGuide: () => {
    setStorageSync(FIRST_OFFLINE_KEY, false);
    set({ isFirstOffline: false });
  },

  loadManifest: async () => {
    try {
      const manifest = await getManifest(get().manifestGeneratedAt || undefined);
      set({
        manifestGeneratedAt: manifest.generated_at,
        manifestIsFull: manifest.is_full,
        manifestResources: manifest.resources,
      });
    } catch {
      // 静默失败
    }
  },

  cacheResource: async (key: string, data: unknown, ttlSeconds: number) => {
    const { cachedResources, cacheSizeBytes, cacheMaxBytes, manifestGeneratedAt } = get();
    const entry: CacheEntry = {
      key,
      data,
      cachedAt: Date.now(),
      ttlSeconds,
      version: manifestGeneratedAt,
      lastAccessedAt: Date.now(),
    };

    const estimatedSize = JSON.stringify(data).length;
    if (cacheSizeBytes + estimatedSize > cacheMaxBytes) {
      await get().evictLRU();
    }

    const newResources = { ...cachedResources, [key]: entry };
    set({ cachedResources: newResources, cacheSizeBytes: cacheSizeBytes + estimatedSize });
    await setStorage(OFFLINE_STORAGE_KEY, newResources);
  },

  getCachedData: <T>(key: string): T | null => {
    const { cachedResources } = get();
    const entry = cachedResources[key];
    if (!entry) {
      // Try loading from storage
      const stored = getStorageSync<Record<string, CacheEntry>>(OFFLINE_STORAGE_KEY);
      if (stored && stored[key]) {
        const storedEntry = stored[key];
        const age = (Date.now() - storedEntry.cachedAt) / 1000;
        if (age > storedEntry.ttlSeconds) {
          return null;
        }
        // Update lastAccessedAt
        storedEntry.lastAccessedAt = Date.now();
        set({ cachedResources: { ...cachedResources, [key]: storedEntry } });
        return storedEntry.data as T;
      }
      return null;
    }

    const age = (Date.now() - entry.cachedAt) / 1000;
    if (age > entry.ttlSeconds) {
      return null;
    }

    entry.lastAccessedAt = Date.now();
    return entry.data as T;
  },

  enqueueSync: (operation: SyncOperation) => {
    set((state) => ({
      syncQueue: [...state.syncQueue, operation],
    }));
  },

  flushSyncQueue: async () => {
    const { syncQueue } = get();
    if (syncQueue.length === 0) return;
    // Attempt to replay sync operations
    // In production, this would call the respective APIs
    set({ syncQueue: [] });
  },

  evictLRU: async () => {
    const { cachedResources } = get();
    const entries = Object.entries(cachedResources);
    if (entries.length === 0) return;

    entries.sort(([, a], [, b]) => a.lastAccessedAt - b.lastAccessedAt);
    // Evict oldest 20%
    const evictCount = Math.max(1, Math.floor(entries.length * 0.2));
    const toEvict = entries.slice(0, evictCount).map(([key]) => key);
    const newResources = { ...cachedResources };
    toEvict.forEach((key) => delete newResources[key]);
    set({ cachedResources: newResources });
    await setStorage(OFFLINE_STORAGE_KEY, newResources);
  },

  cleanExpired: async () => {
    const { cachedResources } = get();
    const now = Date.now();
    const newResources = { ...cachedResources };
    let changed = false;
    Object.entries(newResources).forEach(([key, entry]) => {
      const age = (now - entry.cachedAt) / 1000;
      if (age > entry.ttlSeconds) {
        delete newResources[key];
        changed = true;
      }
    });
    if (changed) {
      set({ cachedResources: newResources });
      await setStorage(OFFLINE_STORAGE_KEY, newResources);
    }
  },

  getCacheUsage: () => {
    const { cacheSizeBytes, cacheMaxBytes } = get();
    if (cacheMaxBytes === 0) return 0;
    return cacheSizeBytes / cacheMaxBytes;
  },
}));
