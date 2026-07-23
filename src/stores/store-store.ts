import { create } from 'zustand';
import Taro from '@tarojs/taro';
import { storeService } from '../services';
import type { NearbyStore, StoreDetail } from '../types/phase3';

const STORAGE_KEY_LOCATION = '__wraplab_user_location__';
const STORAGE_KEY_CACHE_AT = '__wraplab_location_cached_at__';
const LOCATION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const DETAIL_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const DEFAULT_SEARCH_RADIUS = 5000;
const MAX_SEARCH_RADIUS = 50000;

interface StoreDetailCache {
  data: StoreDetail;
  cachedAt: number;
}

interface LocationCache {
  latitude: number;
  longitude: number;
}

interface StoreState {
  /** 用户位置 */
  userLocation: { latitude: number; longitude: number } | null;
  /** 位置权限状态 */
  locationAuthorized: boolean | null;
  /** 定位错误信息 */
  locationError: string | null;

  /** 附近门店列表 */
  nearbyStores: NearbyStore[];
  nearbyStoresLoading: boolean;
  nearbyStoresError: string | null;
  /** 搜索半径 (米) */
  searchRadius: number;

  /** 当前选中的门店 */
  selectedStore: NearbyStore | null;

  /** 门店详情缓存 */
  storeDetailMap: Record<string, StoreDetailCache>;
  storeDetailLoading: boolean;
  storeDetailError: string | null;

  // Actions
  requestLocation: () => Promise<void>;
  fetchNearbyStores: (params: {
    lat: number;
    lng: number;
    radius?: number;
    page?: number;
    size?: number;
  }) => Promise<void>;
  selectStore: (store: NearbyStore | null) => void;
  fetchStoreDetail: (storeId: string) => Promise<StoreDetail>;
  expandSearchRadius: () => void;
  resetSearchRadius: () => void;
}

export const useStoreStore = create<StoreState>((set, get) => ({
  userLocation: null,
  locationAuthorized: null,
  locationError: null,

  nearbyStores: [],
  nearbyStoresLoading: false,
  nearbyStoresError: null,
  searchRadius: DEFAULT_SEARCH_RADIUS,

  selectedStore: null,

  storeDetailMap: {},
  storeDetailLoading: false,
  storeDetailError: null,

  requestLocation: async () => {
    // Check Taro.Storage cache first
    try {
      const cachedAt = Taro.getStorageSync(STORAGE_KEY_CACHE_AT);
      const cachedLocation = Taro.getStorageSync(STORAGE_KEY_LOCATION);
      if (cachedAt && cachedLocation && typeof cachedAt === 'number') {
        if (Date.now() - cachedAt < LOCATION_CACHE_TTL) {
          if (
            typeof cachedLocation === 'object' &&
            cachedLocation !== null &&
            'latitude' in cachedLocation &&
            'longitude' in cachedLocation &&
            typeof (cachedLocation as Record<string, unknown>).latitude === 'number' &&
            typeof (cachedLocation as Record<string, unknown>).longitude === 'number'
          ) {
            const loc = cachedLocation as LocationCache;
            set({
              userLocation: { latitude: loc.latitude, longitude: loc.longitude },
              locationAuthorized: true,
              locationError: null,
            });
            return;
          }
        }
      }
    } catch {
      // no cache
    }

    try {
      const res = await Taro.getLocation({ type: 'gcj02' });
      set({
        userLocation: { latitude: res.latitude, longitude: res.longitude },
        locationAuthorized: true,
        locationError: null,
      });
      // Cache to Storage
      Taro.setStorage({
        key: STORAGE_KEY_LOCATION,
        data: { latitude: res.latitude, longitude: res.longitude },
      });
      Taro.setStorage({ key: STORAGE_KEY_CACHE_AT, data: Date.now() });
    } catch (error) {
      const err = error as { errMsg?: string };
      if (err?.errMsg?.includes('auth deny') || err?.errMsg?.includes('deny')) {
        set({
          locationAuthorized: false,
          locationError: null,
          userLocation: { latitude: 39.9042, longitude: 116.4074 }, // Default: Beijing
        });
      } else {
        set({
          locationAuthorized: true,
          locationError: '定位失败，使用默认位置',
          userLocation: { latitude: 39.9042, longitude: 116.4074 },
        });
      }
    }
  },

  fetchNearbyStores: async (params) => {
    set({ nearbyStoresLoading: true, nearbyStoresError: null });
    try {
      const data = await storeService.getNearbyStores({
        lat: params.lat,
        lng: params.lng,
        radius: params.radius ?? get().searchRadius,
        page: params.page ?? 1,
        size: params.size ?? 20,
      });
      set({
        nearbyStores: data.items,
        nearbyStoresLoading: false,
        nearbyStoresError: null,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '门店数据加载失败';
      set({ nearbyStoresLoading: false, nearbyStoresError: message });
    }
  },

  selectStore: (store: NearbyStore | null) => {
    set({ selectedStore: store });
  },

  fetchStoreDetail: async (storeId: string) => {
    const { storeDetailMap } = get();
    const cached = storeDetailMap[storeId];
    if (cached && Date.now() - cached.cachedAt < DETAIL_CACHE_TTL) {
      // Return from cache - no state update needed, caller reads from map
      return cached.data;
    }

    set({ storeDetailLoading: true, storeDetailError: null });
    try {
      const data = await storeService.getStoreDetail(storeId);
      set({
        storeDetailLoading: false,
        storeDetailError: null,
        storeDetailMap: {
          ...get().storeDetailMap,
          [storeId]: { data, cachedAt: Date.now() },
        },
      });
      return data;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '门店信息加载失败';
      set({ storeDetailLoading: false, storeDetailError: message });
      throw error;
    }
  },

  expandSearchRadius: () => {
    const current = get().searchRadius;
    const newRadius = Math.min(current * 2, MAX_SEARCH_RADIUS);
    set({ searchRadius: newRadius });
  },

  resetSearchRadius: () => {
    set({ searchRadius: DEFAULT_SEARCH_RADIUS });
  },
}));
