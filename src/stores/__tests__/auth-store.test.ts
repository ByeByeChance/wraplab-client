import Taro from '@tarojs/taro';
import { useAuthStore } from '../auth-store';

// Mock services
jest.mock('../../services', () => ({
  authService: {
    login: jest.fn(),
    smsLogin: jest.fn(),
    refreshToken: jest.fn(),
  },
  storeService: {
    getMyStores: jest.fn(),
    switchStore: jest.fn(),
  },
}));

import { authService, storeService } from '../../services';

// Mock storage
jest.mock('../../utils/storage', () => ({
  STORAGE_KEYS: {
    ACCESS_TOKEN: 'wraplab_access_token',
    REFRESH_TOKEN: 'wraplab_refresh_token',
    STAFF_INFO: 'wraplab_staff_info',
  },
  setStorage: jest.fn().mockResolvedValue(undefined),
  getStorage: jest.fn().mockResolvedValue(null),
  removeStorage: jest.fn().mockResolvedValue(undefined),
  getStorageSync: jest.fn().mockReturnValue(null),
  setStorageSync: jest.fn(),
}));

describe('useAuthStore', () => {
  beforeEach(() => {
    (Taro as unknown as Record<string, () => void>).__clearStorage();
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      staff: null,
      isLoggedIn: false,
      loading: false,
      activeStoreId: null,
      storeList: [],
      storeListLoading: false,
      storeListError: null,
      storeSwitching: false,
    });
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('has correct default values', () => {
      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.staff).toBeNull();
      expect(state.isLoggedIn).toBe(false);
      expect(state.loading).toBe(false);
      expect(state.activeStoreId).toBeNull();
      expect(state.storeList).toEqual([]);
    });
  });

  describe('login', () => {
    it('sets tokens and staff on successful login', async () => {
      const mockResponse = {
        accessToken: 'access-123',
        refreshToken: 'refresh-123',
        staff: { id: '1', name: '张三', phone: '13800138000', storeId: 'store-1', storeName: '旗舰店', avatar: '' },
      };
      (authService.login as jest.Mock).mockResolvedValue(mockResponse);

      await useAuthStore.getState().login('13800138000', 'password123');

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe('access-123');
      expect(state.refreshToken).toBe('refresh-123');
      expect(state.staff).toEqual(mockResponse.staff);
      expect(state.isLoggedIn).toBe(true);
      expect(state.loading).toBe(false);
    });

    it('sets loading false and rethrows on failure', async () => {
      (authService.login as jest.Mock).mockRejectedValue(new Error('Invalid credentials'));

      await expect(
        useAuthStore.getState().login('13800138000', 'wrong'),
      ).rejects.toThrow('Invalid credentials');

      expect(useAuthStore.getState().loading).toBe(false);
      expect(useAuthStore.getState().isLoggedIn).toBe(false);
    });
  });

  describe('isTokenExpired', () => {
    it('returns true when no token', () => {
      expect(useAuthStore.getState().isTokenExpired()).toBe(true);
    });

    it('returns true for expired token', () => {
      // Create a token expiring in the past
      const payload = { exp: Math.floor(Date.now() / 1000) - 3600 };
      const expiredToken = `header.${btoa(JSON.stringify(payload))}.signature`;
      useAuthStore.setState({ accessToken: expiredToken });
      expect(useAuthStore.getState().isTokenExpired()).toBe(true);
    });

    it('returns false for valid future token', () => {
      const payload = { exp: Math.floor(Date.now() / 1000) + 7200 };
      const validToken = `header.${btoa(JSON.stringify(payload))}.signature`;
      useAuthStore.setState({ accessToken: validToken });
      expect(useAuthStore.getState().isTokenExpired()).toBe(false);
    });
  });

  describe('logout', () => {
    it('clears all auth state', () => {
      useAuthStore.setState({
        accessToken: 'token',
        refreshToken: 'refresh',
        staff: { id: '1', name: '张三', phone: '13800138000', storeId: 's1', storeName: '店', avatar: '' },
        isLoggedIn: true,
      });

      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.staff).toBeNull();
      expect(state.isLoggedIn).toBe(false);
    });
  });

  describe('setStaff', () => {
    it('updates staff info', () => {
      const staff = { id: '2', name: '李四', phone: '13900139000', storeId: 's2', storeName: '分店', avatar: '' };
      useAuthStore.getState().setStaff(staff);
      expect(useAuthStore.getState().staff).toEqual(staff);
    });
  });

  describe('fetchMyStores', () => {
    it('loads store list', async () => {
      const mockStores = [
        { storeId: 's1', name: '旗舰店', address: '北京市朝阳区', role: 'sales' as const, isActive: true },
        { storeId: 's2', name: '分店', address: '上海市浦东新区', role: 'viewer' as const, isActive: false },
      ];
      (storeService.getMyStores as jest.Mock).mockResolvedValue(mockStores);

      await useAuthStore.getState().fetchMyStores();

      const state = useAuthStore.getState();
      expect(state.storeList).toHaveLength(2);
      expect(state.storeListLoading).toBe(false);
      expect(state.storeListError).toBeNull();
    });

    it('sets error on failure', async () => {
      (storeService.getMyStores as jest.Mock).mockRejectedValue(new Error('Network error'));

      await useAuthStore.getState().fetchMyStores();

      const state = useAuthStore.getState();
      expect(state.storeListLoading).toBe(false);
      expect(state.storeListError).toBe('Network error');
    });
  });

  describe('switchStore', () => {
    it('switches active store', async () => {
      useAuthStore.setState({
        storeList: [
          { storeId: 's1', name: '旗舰店', address: '北京市朝阳区', role: 'sales' as const, isActive: true },
          { storeId: 's2', name: '分店', address: '上海市浦东新区', role: 'viewer' as const, isActive: false },
        ],
      });
      (storeService.switchStore as jest.Mock).mockResolvedValue({
        accessToken: 'new-token',
        refreshToken: 'new-refresh',
        storeName: '分店',
      });

      await useAuthStore.getState().switchStore('s2');

      const state = useAuthStore.getState();
      expect(state.activeStoreId).toBe('s2');
      expect(state.accessToken).toBe('new-token');
      expect(state.storeSwitching).toBe(false);
    });

    it('prevents concurrent switch', async () => {
      useAuthStore.setState({ storeSwitching: true });
      (storeService.switchStore as jest.Mock).mockResolvedValue({ accessToken: 't', refreshToken: 'r', storeName: 'n' });

      await useAuthStore.getState().switchStore('s2');
      // Should return early without calling the API again
      expect(storeService.switchStore).not.toHaveBeenCalled();
    });
  });

  describe('saveTokens', () => {
    it('persists and updates tokens', async () => {
      await useAuthStore.getState().saveTokens({ accessToken: 'at', refreshToken: 'rt' });
      const state = useAuthStore.getState();
      expect(state.accessToken).toBe('at');
      expect(state.refreshToken).toBe('rt');
    });
  });
});
