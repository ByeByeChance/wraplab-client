import { create } from 'zustand';
import Taro from '@tarojs/taro';
import { authService, storeService } from '../services';
import { STORAGE_KEYS, setStorage, getStorage, removeStorage } from '../utils/storage';
import type { StaffInfo, LoginResponse, RefreshResponse, AuthTokens, StoreInfo } from '../types';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  staff: StaffInfo | null;
  isLoggedIn: boolean;
  loading: boolean;

  /** 当前活跃门店 ID */
  activeStoreId: string | null;
  /** 店员关联的所有门店列表 */
  storeList: StoreInfo[];
  /** 门店列表加载状态 */
  storeListLoading: boolean;
  /** 门店列表加载错误 */
  storeListError: string | null;
  /** 切换门店操作中 */
  storeSwitching: boolean;

  /** 手机号+密码登录 */
  login: (phone: string, password: string) => Promise<void>;
  /** 短信验证码登录 */
  smsLogin: (phone: string, smsCode: string) => Promise<{ needSetPassword?: boolean }>;
  /** 刷新 Token (401 拦截器调用) */
  refreshAccessToken: () => Promise<void>;
  /** 退出登录 (清除 Token + 跳转) */
  logout: () => void;
  /** 从本地存储恢复登录态 */
  restoreSession: () => Promise<void>;
  /** 检查 Token 是否过期 */
  isTokenExpired: () => boolean;
  /** 保存 Token 到本地存储 */
  saveTokens: (tokens: AuthTokens) => Promise<void>;
  /** 设置店员信息 */
  setStaff: (staff: StaffInfo) => void;

  // Phase 5: 门店切换
  /** 获取我的门店列表 */
  fetchMyStores: () => Promise<void>;
  /** 切换活跃门店 */
  switchStore: (storeId: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
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

  login: async (phone: string, password: string) => {
    set({ loading: true });
    try {
      const res: LoginResponse = await authService.login({ phone, password });
      await setStorage(STORAGE_KEYS.ACCESS_TOKEN, res.accessToken);
      await setStorage(STORAGE_KEYS.REFRESH_TOKEN, res.refreshToken);
      set({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        staff: res.staff,
        isLoggedIn: true,
        loading: false,
      });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  smsLogin: async (phone: string, smsCode: string) => {
    set({ loading: true });
    try {
      const res = await authService.smsLogin({ phone, sms_code: smsCode });
      await setStorage(STORAGE_KEYS.ACCESS_TOKEN, res.access_token);
      await setStorage(STORAGE_KEYS.REFRESH_TOKEN, res.refresh_token);
      const staff: StaffInfo = {
        id: res.staff.id,
        name: res.staff.name,
        phone: res.staff.phone,
        storeId: res.staff.storeId,
        storeName: res.staff.storeName,
        avatar: res.staff.avatar,
      };
      await setStorage(STORAGE_KEYS.STAFF_INFO, staff);
      set({
        accessToken: res.access_token,
        refreshToken: res.refresh_token,
        staff,
        isLoggedIn: true,
        loading: false,
      });
      return { needSetPassword: res.need_set_password ?? false };
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  refreshAccessToken: async () => {
    const { refreshToken } = get();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    const res: RefreshResponse = await authService.refreshToken({ refreshToken });
    await setStorage(STORAGE_KEYS.ACCESS_TOKEN, res.accessToken);
    await setStorage(STORAGE_KEYS.REFRESH_TOKEN, res.refreshToken);
    set({
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
    });
  },

  logout: () => {
    removeStorage(STORAGE_KEYS.ACCESS_TOKEN);
    removeStorage(STORAGE_KEYS.REFRESH_TOKEN);
    removeStorage(STORAGE_KEYS.STAFF_INFO);
    set({
      accessToken: null,
      refreshToken: null,
      staff: null,
      isLoggedIn: false,
    });
    Taro.redirectTo({ url: '/pages/auth/login' });
  },

  restoreSession: async () => {
    try {
      const accessToken = await getStorage<string>(STORAGE_KEYS.ACCESS_TOKEN);
      const refreshToken = await getStorage<string>(STORAGE_KEYS.REFRESH_TOKEN);
      const staff = await getStorage<StaffInfo>(STORAGE_KEYS.STAFF_INFO);

      if (!accessToken || !refreshToken) {
        set({ isLoggedIn: false, loading: false });
        return;
      }

      set({ accessToken, refreshToken, staff, loading: true });

      // 检查 Token 是否过期
      const tokenPayload = parseJwtPayload(accessToken);
      if (tokenPayload && tokenPayload.exp) {
        const isExpired = (tokenPayload.exp * 1000) < (Date.now() + 60000); // 60s 缓冲
        if (isExpired) {
          try {
            const res: RefreshResponse = await authService.refreshToken({ refreshToken });
            await setStorage(STORAGE_KEYS.ACCESS_TOKEN, res.accessToken);
            await setStorage(STORAGE_KEYS.REFRESH_TOKEN, res.refreshToken);
            set({ accessToken: res.accessToken, refreshToken: res.refreshToken });
          } catch {
            // refresh 也过期，设置未登录
            set({ isLoggedIn: false, loading: false });
            return;
          }
        }
      }

      set({ isLoggedIn: true, loading: false });
    } catch {
      set({ isLoggedIn: false, loading: false });
    }
  },

  isTokenExpired: (): boolean => {
    const { accessToken } = get();
    if (!accessToken) return true;
    const payload = parseJwtPayload(accessToken);
    if (!payload || !payload.exp) return true;
    return (payload.exp * 1000) < (Date.now() + 60000);
  },

  saveTokens: async (tokens: AuthTokens) => {
    await setStorage(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
    await setStorage(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
    set({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  },

  setStaff: (staff: StaffInfo) => {
    set({ staff });
    setStorage(STORAGE_KEYS.STAFF_INFO, staff);
  },

  // Phase 5: 门店切换
  fetchMyStores: async () => {
    set({ storeListLoading: true, storeListError: null });
    try {
      const stores = await storeService.getMyStores();
      const activeStoreId = get().activeStoreId || get().staff?.storeId || null;
      const mappedStores: StoreInfo[] = stores.map((s: StoreInfo) => ({
        ...s,
        isActive: s.storeId === activeStoreId,
      }));
      set({
        storeList: mappedStores,
        storeListLoading: false,
        storeListError: null,
        activeStoreId: activeStoreId || mappedStores[0]?.storeId || null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '门店列表加载失败';
      set({ storeListLoading: false, storeListError: message });
    }
  },

  switchStore: async (storeId: string) => {
    const { storeSwitching } = get();
    if (storeSwitching) return;

    set({ storeSwitching: true });
    try {
      const res = await storeService.switchStore(storeId);
      await setStorage(STORAGE_KEYS.ACCESS_TOKEN, res.accessToken);
      await setStorage(STORAGE_KEYS.REFRESH_TOKEN, res.refreshToken);

      const updatedList = get().storeList.map((s) => ({
        ...s,
        isActive: s.storeId === storeId,
      }));

      set({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        activeStoreId: storeId,
        storeList: updatedList,
        storeSwitching: false,
      });

      Taro.showToast({ title: `已切换到${res.storeName}`, icon: 'success' });
      Taro.eventCenter.trigger('store:switched', { storeId });
    } catch (err) {
      set({ storeSwitching: false });
      const message = err instanceof Error ? err.message : '切换失败，请重试';
      Taro.showToast({ title: message, icon: 'none' });
      throw err;
    }
  },
}));

/**
 * 简易 JWT Payload 解析 (不验证签名)
 */
function parseJwtPayload(token: string): { exp?: number; sub?: string; [key: string]: unknown } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}
