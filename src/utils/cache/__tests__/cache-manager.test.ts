import Taro from '@tarojs/taro';
import { CacheManager } from '../cache-manager';

// Mock the LRU cache to avoid side effects
jest.mock('../lru-cache', () => ({
  LRUCache: jest.fn().mockImplementation(() => ({
    get: jest.fn().mockReturnValue(undefined),
    put: jest.fn(),
    delete: jest.fn(),
    getCurrentSize: jest.fn().mockReturnValue(0),
  })),
}));

describe('CacheManager', () => {
  let cacheManager: CacheManager;

  beforeEach(() => {
    (Taro as unknown as Record<string, () => void>).__clearStorage();
    cacheManager = new CacheManager();
  });

  describe('get', () => {
    it('returns null when key not in LRU or storage', () => {
      const result = cacheManager.get<string>('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getCurrentSize', () => {
    it('returns current cache size', () => {
      expect(cacheManager.getCurrentSize()).toBe(0);
    });
  });

  describe('initialize', () => {
    it('completes without error', async () => {
      await expect(cacheManager.initialize()).resolves.toBeUndefined();
    });
  });

  describe('cleanExpired', () => {
    it('completes without error', async () => {
      await expect(cacheManager.cleanExpired()).resolves.toBeUndefined();
    });
  });

  describe('cacheImage', () => {
    it('returns temp file path on successful download', async () => {
      const result = await cacheManager.cacheImage('https://example.com/image.png');
      expect(result).toBe('/tmp/mock-image.png');
    });

    it('returns empty string when download throws', async () => {
      const originalDownload = Taro.downloadFile;
      Taro.downloadFile = jest.fn().mockRejectedValue(new Error('Download failed'));

      const result = await cacheManager.cacheImage('https://example.com/missing.png');
      expect(result).toBe('');

      Taro.downloadFile = originalDownload;
    });
  });
});
