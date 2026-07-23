import { useOfflineStore } from '../offline-store';

// Mock services and storage
jest.mock('../../services/offline.service', () => ({
  getManifest: jest.fn().mockResolvedValue({
    generated_at: '2026-07-25T00:00:00Z',
    is_full: true,
    resources: [],
  }),
}));

jest.mock('../../utils/storage', () => ({
  setStorage: jest.fn().mockResolvedValue(undefined),
  getStorageSync: jest.fn().mockReturnValue(null),
  setStorageSync: jest.fn(),
}));

describe('useOfflineStore', () => {
  beforeEach(() => {
    useOfflineStore.setState({
      isOffline: false,
      isRecovering: false,
      isFirstOffline: true,
      manifestGeneratedAt: '',
      manifestIsFull: false,
      manifestResources: [],
      cachedResources: {},
      syncQueue: [],
      cacheSizeBytes: 0,
      cacheMaxBytes: 52428800,
      imageCacheMap: {},
    });
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('has correct default values', () => {
      const state = useOfflineStore.getState();
      expect(state.isOffline).toBe(false);
      expect(state.isRecovering).toBe(false);
      expect(state.syncQueue).toEqual([]);
      expect(state.cachedResources).toEqual({});
      expect(state.cacheSizeBytes).toBe(0);
    });
  });

  describe('setOffline', () => {
    it('sets isOffline to true', () => {
      useOfflineStore.getState().setOffline(true);
      expect(useOfflineStore.getState().isOffline).toBe(true);
    });

    it('sets isOffline to false', () => {
      useOfflineStore.getState().setOffline(false);
      expect(useOfflineStore.getState().isOffline).toBe(false);
    });
  });

  describe('dismissFirstOfflineGuide', () => {
    it('sets isFirstOffline to false', () => {
      useOfflineStore.getState().dismissFirstOfflineGuide();
      expect(useOfflineStore.getState().isFirstOffline).toBe(false);
    });
  });

  describe('loadManifest', () => {
    it('loads and stores manifest data', async () => {
      await useOfflineStore.getState().loadManifest();

      const state = useOfflineStore.getState();
      expect(state.manifestGeneratedAt).toBe('2026-07-25T00:00:00Z');
      expect(state.manifestIsFull).toBe(true);
    });
  });

  describe('enqueueSync', () => {
    it('adds operations to sync queue', () => {
      useOfflineStore.getState().enqueueSync({
        id: 'op-1',
        type: 'like',
        payload: { caseId: '1' },
        createdAt: Date.now(),
      });

      useOfflineStore.getState().enqueueSync({
        id: 'op-2',
        type: 'favorite',
        payload: { caseId: '2' },
        createdAt: Date.now(),
      });

      expect(useOfflineStore.getState().syncQueue).toHaveLength(2);
    });
  });

  describe('flushSyncQueue', () => {
    it('clears sync queue', async () => {
      useOfflineStore.setState({
        syncQueue: [
          { id: 'op-1', type: 'like', payload: { caseId: '1' }, createdAt: Date.now() },
        ],
      });

      await useOfflineStore.getState().flushSyncQueue();

      expect(useOfflineStore.getState().syncQueue).toEqual([]);
    });
  });

  describe('evictLRU', () => {
    it('evicts oldest entries', async () => {
      useOfflineStore.setState({
        cachedResources: {
          'key1': { key: 'key1', data: 'old', cachedAt: 1000, ttlSeconds: 3600, version: '1', lastAccessedAt: 1000 },
          'key2': { key: 'key2', data: 'mid', cachedAt: 2000, ttlSeconds: 3600, version: '1', lastAccessedAt: 2000 },
          'key3': { key: 'key3', data: 'new', cachedAt: 3000, ttlSeconds: 3600, version: '1', lastAccessedAt: 3000 },
        },
      });

      await useOfflineStore.getState().evictLRU();

      const { cachedResources } = useOfflineStore.getState();
      expect(cachedResources['key1']).toBeUndefined(); // oldest should be evicted
    });
  });

  describe('cleanExpired', () => {
    it('removes expired cached entries', async () => {
      const now = Date.now();
      useOfflineStore.setState({
        cachedResources: {
          'fresh': { key: 'fresh', data: 'data', cachedAt: now - 1000, ttlSeconds: 3600, version: '1', lastAccessedAt: now },
          'stale': { key: 'stale', data: 'data', cachedAt: now - 10000, ttlSeconds: 1, version: '1', lastAccessedAt: now - 5000 },
        },
      });

      await useOfflineStore.getState().cleanExpired();

      const { cachedResources } = useOfflineStore.getState();
      expect(cachedResources['fresh']).toBeDefined();
      expect(cachedResources['stale']).toBeUndefined();
    });
  });

  describe('getCacheUsage', () => {
    it('returns 0 when cache is empty', () => {
      expect(useOfflineStore.getState().getCacheUsage()).toBe(0);
    });
  });

  describe('getCachedData', () => {
    it('returns null for missing key', () => {
      expect(useOfflineStore.getState().getCachedData('nonexistent')).toBeNull();
    });

    it('returns data for valid cached entry', () => {
      const now = Date.now();
      useOfflineStore.setState({
        cachedResources: {
          'test-key': { key: 'test-key', data: { name: 'test' }, cachedAt: now, ttlSeconds: 3600, version: '1', lastAccessedAt: now },
        },
      });

      expect(useOfflineStore.getState().getCachedData<{ name: string }>('test-key')).toEqual({ name: 'test' });
    });

    it('returns null for expired cached entry', () => {
      const now = Date.now();
      useOfflineStore.setState({
        cachedResources: {
          'expired': { key: 'expired', data: 'data', cachedAt: now - 10000, ttlSeconds: 1, version: '1', lastAccessedAt: now - 5000 },
        },
      });

      expect(useOfflineStore.getState().getCachedData('expired')).toBeNull();
    });
  });

  describe('setRecovering', () => {
    it('sets isRecovering to true temporarily', () => {
      jest.useFakeTimers();
      useOfflineStore.getState().setRecovering();
      expect(useOfflineStore.getState().isRecovering).toBe(true);

      jest.advanceTimersByTime(2000);
      expect(useOfflineStore.getState().isRecovering).toBe(false);
      jest.useRealTimers();
    });
  });
});
