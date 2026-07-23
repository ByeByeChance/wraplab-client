import { create } from 'zustand';
import { colorService } from '../services';
import { CACHE_TTL } from '../utils/constants';
import type { ColorBrand, ColorSwatchItem, Material } from '../types';

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
}

function isCacheValid<T>(entry: CacheEntry<T> | null): boolean {
  if (!entry) return false;
  return Date.now() - entry.cachedAt < CACHE_TTL;
}

interface ColorState {
  /** 色卡品牌列表 */
  colorBrands: ColorBrand[];
  colorBrandsLoading: boolean;
  colorBrandsError: string | null;
  colorBrandsCache: CacheEntry<ColorBrand[]> | null;

  /** 当前选中色卡品牌 ID */
  selectedColorBrandId: string | null;

  /** 颜色列表 (按 brandId 缓存) */
  swatchesMap: Record<string, CacheEntry<ColorSwatchItem[]>>;
  swatches: ColorSwatchItem[];
  swatchesLoading: boolean;
  swatchesError: string | null;

  /** 当前选中的颜色 */
  selectedSwatch: ColorSwatchItem | null;

  /** 自定义 HEX 颜色 */
  customHex: string | null;

  /** 材质列表 */
  materials: Material[];
  materialsLoading: boolean;
  materialsError: string | null;
  materialsCache: CacheEntry<Material[]> | null;

  /** 当前选中材质 */
  selectedMaterial: Material | null;

  /** 获取色卡品牌列表 */
  fetchColorBrands: () => Promise<void>;
  /** 选择色卡品牌, 自动加载颜色列表 */
  selectColorBrand: (brandId: string) => Promise<void>;
  /** 获取颜色列表 */
  fetchSwatches: (brandId: string) => Promise<void>;
  /** 选择颜色 (从色卡列表) */
  selectSwatch: (swatch: ColorSwatchItem) => void;
  /** 设置自定义颜色 */
  setCustomColor: (hex: string) => void;
  /** 清除自定义颜色 */
  clearCustomColor: () => void;
  /** 获取材质列表 */
  fetchMaterials: () => Promise<void>;
  /** 选择材质 */
  selectMaterial: (material: Material) => void;
  /** 获取当前生效的 HEX 颜色 */
  getActiveHex: () => string | null;
  /** 获取当前生效的色块信息 */
  getActiveSwatchInfo: () => { name: string; hex: string } | null;
}

export const useColorStore = create<ColorState>((set, get) => ({
  colorBrands: [],
  colorBrandsLoading: false,
  colorBrandsError: null,
  colorBrandsCache: null,

  selectedColorBrandId: null,

  swatchesMap: {},
  swatches: [],
  swatchesLoading: false,
  swatchesError: null,

  selectedSwatch: null,

  customHex: null,

  materials: [],
  materialsLoading: false,
  materialsError: null,
  materialsCache: null,

  selectedMaterial: null,

  fetchColorBrands: async () => {
    const { colorBrandsCache } = get();
    if (isCacheValid(colorBrandsCache)) {
      set({
        colorBrands: colorBrandsCache!.data,
        colorBrandsLoading: false,
        colorBrandsError: null,
      });
      return;
    }

    set({ colorBrandsLoading: true, colorBrandsError: null });
    try {
      const data = await colorService.getColorBrands();
      set({
        colorBrands: data,
        colorBrandsLoading: false,
        colorBrandsError: null,
        colorBrandsCache: { data, cachedAt: Date.now() },
      });
      // 默认选中第一个品牌
      if (data.length > 0 && !get().selectedColorBrandId) {
        await get().selectColorBrand(data[0].id);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '色卡品牌加载失败';
      set({ colorBrandsLoading: false, colorBrandsError: message });
    }
  },

  selectColorBrand: async (brandId: string) => {
    set({ selectedColorBrandId: brandId });
    await get().fetchSwatches(brandId);
  },

  fetchSwatches: async (brandId: string) => {
    const { swatchesMap } = get();
    if (isCacheValid(swatchesMap[brandId])) {
      set({
        swatches: swatchesMap[brandId].data,
        swatchesLoading: false,
        swatchesError: null,
      });
      return;
    }

    set({ swatchesLoading: true, swatchesError: null });
    try {
      const res = await colorService.getSwatches(brandId);
      set({
        swatches: res.items,
        swatchesLoading: false,
        swatchesError: null,
        swatchesMap: {
          ...get().swatchesMap,
          [brandId]: { data: res.items, cachedAt: Date.now() },
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '颜色加载失败';
      set({ swatchesLoading: false, swatchesError: message });
    }
  },

  selectSwatch: (swatch: ColorSwatchItem) => {
    set({ selectedSwatch: swatch, customHex: null });
  },

  setCustomColor: (hex: string) => {
    set({ customHex: hex, selectedSwatch: null });
  },

  clearCustomColor: () => {
    set({ customHex: null });
  },

  fetchMaterials: async () => {
    const { materialsCache } = get();
    if (isCacheValid(materialsCache)) {
      set({
        materials: materialsCache!.data,
        materialsLoading: false,
        materialsError: null,
      });
      // 默认选中 glossy 材质
      const glossy = materialsCache!.data.find((m) => m.type === 'glossy');
      if (glossy && !get().selectedMaterial) {
        set({ selectedMaterial: glossy });
      }
      return;
    }

    set({ materialsLoading: true, materialsError: null });
    try {
      const data = await colorService.getMaterials();
      set({
        materials: data,
        materialsLoading: false,
        materialsError: null,
        materialsCache: { data, cachedAt: Date.now() },
      });
      // 默认选中 type 为 'glossy' 的材质 (亮面)，不依赖 API 返回顺序
      const glossy = data.find((m) => m.type === 'glossy');
      if (glossy && !get().selectedMaterial) {
        set({ selectedMaterial: glossy });
      } else if (data.length > 0 && !get().selectedMaterial) {
        set({ selectedMaterial: data[0] });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '材质加载失败';
      set({ materialsLoading: false, materialsError: message });
    }
  },

  selectMaterial: (material: Material) => {
    set({ selectedMaterial: material });
  },

  getActiveHex: (): string | null => {
    const { selectedSwatch, customHex } = get();
    if (customHex) return `#${customHex}`;
    if (selectedSwatch) return selectedSwatch.hex;
    return null;
  },

  getActiveSwatchInfo: (): { name: string; hex: string } | null => {
    const { selectedSwatch, customHex } = get();
    if (customHex) {
      return { name: '自定义', hex: `#${customHex}` };
    }
    if (selectedSwatch) {
      return { name: selectedSwatch.name, hex: selectedSwatch.hex };
    }
    return null;
  },
}));
