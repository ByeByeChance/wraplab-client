import { create } from 'zustand';
import { vehicleService } from '../services';
import { CACHE_TTL } from '../utils/constants';
import type { Brand, Series, Model } from '../types';

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
}

interface VehicleState {
  /** 品牌列表 (全量, 首次加载后缓存) */
  brands: Brand[];
  brandsLoading: boolean;
  brandsError: string | null;
  brandsCache: CacheEntry<Brand[]> | null;

  /** 当前选中品牌 */
  selectedBrand: Brand | null;

  /** 车系列表 (按 brandId 缓存) */
  seriesMap: Record<string, CacheEntry<Series[]>>;
  series: Series[];
  seriesLoading: boolean;
  seriesError: string | null;

  /** 当前选中的车系 */
  selectedSeries: Series | null;

  /** 型号列表 (按 seriesId 缓存) */
  modelsMap: Record<string, CacheEntry<Model[]>>;
  models: Model[];
  modelsLoading: boolean;
  modelsError: string | null;

  /** 当前选中的型号 */
  selectedModel: Model | null;

  /** 获取品牌列表 */
  fetchBrands: () => Promise<void>;
  /** 选择品牌, 自动加载车系 */
  selectBrand: (brand: Brand) => Promise<void>;
  /** 获取车系列表 */
  fetchSeries: (brandId: string) => Promise<void>;
  /** 选择车系, 自动加载型号 */
  selectSeries: (series: Series) => Promise<void>;
  /** 获取型号列表 */
  fetchModels: (seriesId: string) => Promise<void>;
  /** 选择型号 */
  selectModel: (model: Model) => void;
  /** 重置到品牌选择 */
  resetToBrands: () => void;
  /** 重置到车系选择 */
  resetToSeries: (brandId: string) => void;
}

function isCacheValid<T>(entry: CacheEntry<T> | null): boolean {
  if (!entry) return false;
  return Date.now() - entry.cachedAt < CACHE_TTL;
}

export const useVehicleStore = create<VehicleState>((set, get) => ({
  brands: [],
  brandsLoading: false,
  brandsError: null,
  brandsCache: null,

  selectedBrand: null,

  seriesMap: {},
  series: [],
  seriesLoading: false,
  seriesError: null,

  selectedSeries: null,

  modelsMap: {},
  models: [],
  modelsLoading: false,
  modelsError: null,

  selectedModel: null,

  fetchBrands: async () => {
    const { brandsCache } = get();
    // 缓存命中
    if (isCacheValid(brandsCache)) {
      set({ brands: brandsCache!.data, brandsLoading: false, brandsError: null });
      return;
    }

    set({ brandsLoading: true, brandsError: null });
    try {
      const data = await vehicleService.getBrands();
      set({
        brands: data,
        brandsLoading: false,
        brandsError: null,
        brandsCache: { data, cachedAt: Date.now() },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '品牌加载失败';
      set({ brandsLoading: false, brandsError: message });
    }
  },

  selectBrand: async (brand: Brand) => {
    set({ selectedBrand: brand, series: [], seriesError: null });
    await get().fetchSeries(brand.id);
  },

  fetchSeries: async (brandId: string) => {
    const { seriesMap } = get();
    // 缓存命中
    if (isCacheValid(seriesMap[brandId])) {
      set({
        series: seriesMap[brandId].data,
        seriesLoading: false,
        seriesError: null,
      });
      return;
    }

    set({ seriesLoading: true, seriesError: null });
    try {
      const data = await vehicleService.getSeries(brandId);
      set({
        series: data,
        seriesLoading: false,
        seriesError: null,
        seriesMap: {
          ...get().seriesMap,
          [brandId]: { data, cachedAt: Date.now() },
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '车系加载失败';
      set({ seriesLoading: false, seriesError: message });
    }
  },

  selectSeries: async (series: Series) => {
    set({ selectedSeries: series, models: [], modelsError: null });
    await get().fetchModels(series.id);
  },

  fetchModels: async (seriesId: string) => {
    const { modelsMap } = get();
    // 缓存命中
    if (isCacheValid(modelsMap[seriesId])) {
      set({
        models: modelsMap[seriesId].data,
        modelsLoading: false,
        modelsError: null,
      });
      return;
    }

    set({ modelsLoading: true, modelsError: null });
    try {
      const data = await vehicleService.getModels(seriesId);
      set({
        models: data,
        modelsLoading: false,
        modelsError: null,
        modelsMap: {
          ...get().modelsMap,
          [seriesId]: { data, cachedAt: Date.now() },
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '型号加载失败';
      set({ modelsLoading: false, modelsError: message });
    }
  },

  selectModel: (model: Model) => {
    set({ selectedModel: model });
  },

  resetToBrands: () => {
    set({
      selectedBrand: null,
      selectedSeries: null,
      selectedModel: null,
      series: [],
      models: [],
    });
  },

  resetToSeries: (brandId: string) => {
    set({
      selectedSeries: null,
      selectedModel: null,
      models: [],
    });
    const { seriesMap } = get();
    if (isCacheValid(seriesMap[brandId])) {
      set({ series: seriesMap[brandId].data });
    }
  },
}));
