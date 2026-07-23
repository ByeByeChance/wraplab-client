import { create } from 'zustand';
import Taro from '@tarojs/taro';
import { materialService } from '../services';
import type { MaterialDetail } from '../types/phase3';

const STORAGE_KEY = '__wraplab_compare_materials__';
const MAX_COMPARE = 3;
const MATERIAL_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

interface MaterialCompareState {
  /** 已选对比材质列表 */
  selectedMaterials: MaterialDetail[];
  /** 材质列表 */
  allMaterials: MaterialDetail[];
  allMaterialsLoading: boolean;
  allMaterialsError: string | null;
  allMaterialsLastFetchAt: number | null;

  /** 当前查看详情的材质 */
  detailMaterial: MaterialDetail | null;
  detailVisible: boolean;

  /** 材质选择面板可见性 */
  pickerVisible: boolean;

  // Actions
  fetchAllMaterials: () => Promise<void>;
  addToCompare: (material: MaterialDetail) => void;
  removeFromCompare: (materialId: string) => void;
  clearCompare: () => void;
  toggleDetail: (material?: MaterialDetail) => void;
  togglePicker: () => void;
  persist: () => void;
  restore: () => Promise<void>;
}

export const useMaterialCompareStore = create<MaterialCompareState>(
  (set, get) => ({
    selectedMaterials: [],
    allMaterials: [],
    allMaterialsLoading: false,
    allMaterialsError: null,
    allMaterialsLastFetchAt: null,

    detailMaterial: null,
    detailVisible: false,

    pickerVisible: false,

    fetchAllMaterials: async () => {
      const { allMaterials, allMaterialsLastFetchAt } = get();
      if (
        allMaterials.length > 0 &&
        allMaterialsLastFetchAt &&
        Date.now() - allMaterialsLastFetchAt < MATERIAL_CACHE_TTL
      ) {
        return;
      }
      set({ allMaterialsLoading: true, allMaterialsError: null });
      try {
        const data = await materialService.getMaterials();
        set({
          allMaterials: data.items,
          allMaterialsLoading: false,
          allMaterialsError: null,
          allMaterialsLastFetchAt: Date.now(),
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '材质数据加载失败';
        set({ allMaterialsLoading: false, allMaterialsError: message });
      }
    },

    addToCompare: (material: MaterialDetail) => {
      const { selectedMaterials } = get();
      if (selectedMaterials.length >= MAX_COMPARE) {
        Taro.showToast({ title: '最多对比 3 种材质', icon: 'none' });
        return;
      }
      if (selectedMaterials.find((m) => m.id === material.id)) {
        Taro.showToast({ title: '该材质已在对比列表中', icon: 'none' });
        return;
      }
      const updated = [...selectedMaterials, material];
      set({ selectedMaterials: updated, pickerVisible: false });
      Taro.showToast({ title: '已加入对比', icon: 'success', duration: 1500 });
      get().persist();
    },

    removeFromCompare: (materialId: string) => {
      const updated = get().selectedMaterials.filter(
        (m) => m.id !== materialId,
      );
      set({ selectedMaterials: updated });
      Taro.showToast({ title: '已移出对比', icon: 'none', duration: 1500 });
      get().persist();
    },

    clearCompare: () => {
      set({ selectedMaterials: [] });
      Taro.removeStorage({ key: STORAGE_KEY });
    },

    toggleDetail: (material?: MaterialDetail) => {
      if (material) {
        set({ detailMaterial: material, detailVisible: true });
      } else {
        set({ detailMaterial: null, detailVisible: false });
      }
    },

    togglePicker: () => {
      set({ pickerVisible: !get().pickerVisible });
    },

    persist: () => {
      const { selectedMaterials } = get();
      Taro.setStorage({
        key: STORAGE_KEY,
        data: selectedMaterials.map((m) => m.id),
      });
    },

    restore: async () => {
      try {
        const ids = Taro.getStorageSync(STORAGE_KEY) as
          | string[]
          | undefined;
        if (ids && ids.length > 0) {
          const { allMaterials } = get();
          if (allMaterials.length === 0) {
            await get().fetchAllMaterials();
          }
          const currentMaterials = get().allMaterials;
          const restored = currentMaterials.filter((m) => ids.includes(m.id));
          const missingIds = ids.filter(
            (id) => !currentMaterials.some((m) => m.id === id),
          );
          if (missingIds.length > 0) {
            Taro.showToast({
              title: `${missingIds.length} 种材质已下架，已从对比列表移除`,
              icon: 'none',
              duration: 2500,
            });
          }
          set({ selectedMaterials: restored });
        }
      } catch {
        // no stored data
      }
    },
  }),
);
