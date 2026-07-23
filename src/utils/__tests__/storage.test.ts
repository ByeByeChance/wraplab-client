import Taro from '@tarojs/taro';
import { setStorage, getStorage, removeStorage, getStorageSync, setStorageSync } from '../storage';

describe('storage', () => {
  beforeEach(() => {
    (Taro as unknown as Record<string, () => void>).__clearStorage();
  });

  describe('setStorage', () => {
    it('stores a value as JSON', async () => {
      await setStorage('test_key', { name: 'test' });
      const raw = Taro.getStorageSync('test_key');
      expect(JSON.parse(raw!)).toEqual({ name: 'test' });
    });

    it('handles primitives', async () => {
      await setStorage('num', 42);
      const raw = Taro.getStorageSync('num');
      expect(raw).toBe('42');
    });
  });

  describe('getStorage', () => {
    it('retrieves a stored value', async () => {
      Taro.setStorageSync('test_key', JSON.stringify({ name: 'test' }));
      const result = await getStorage<{ name: string }>('test_key');
      expect(result).toEqual({ name: 'test' });
    });

    it('returns null for missing key', async () => {
      const result = await getStorage('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('removeStorage', () => {
    it('removes a stored value', async () => {
      Taro.setStorageSync('test_key', JSON.stringify({ name: 'test' }));
      await removeStorage('test_key');
      const result = Taro.getStorageSync('test_key');
      expect(result).toBeNull();
    });
  });

  describe('getStorageSync', () => {
    it('retrieves value synchronously', () => {
      Taro.setStorageSync('sync_key', JSON.stringify({ name: 'sync' }));
      expect(getStorageSync<{ name: string }>('sync_key')).toEqual({ name: 'sync' });
    });

    it('returns null for missing key', () => {
      expect(getStorageSync('nonexistent')).toBeNull();
    });
  });

  describe('setStorageSync', () => {
    it('stores value synchronously', () => {
      setStorageSync('sync_set', { id: 1 });
      const raw = Taro.getStorageSync('sync_set');
      expect(JSON.parse(raw!)).toEqual({ id: 1 });
    });
  });
});
