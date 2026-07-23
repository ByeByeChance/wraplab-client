import { create } from 'zustand';
import { getModelParts as fetchModelParts } from '../services/part.service';
import type { ModelPart } from '../services/part.service';

/** 重导出类型方便使用 */
export type { ModelPart };

interface PartState {
  /** 车型部件列表 */
  parts: ModelPart[];
  partsLoading: boolean;
  partsError: string | null;

  /** 当前选中部件 */
  selectedPart: ModelPart | null;
  /** 部件颜色映射: partCode -> hex */
  partColorMap: Record<string, string>;

  /** 获取车型部件列表 */
  fetchParts: (modelId: string) => Promise<void>;
  /** 选中指定部件 */
  selectPart: (part: ModelPart) => void;
  /** 设置部件颜色 */
  setPartColor: (partCode: string, hex: string) => void;
  /** 重置所有部件颜色 */
  resetAllParts: () => void;
  /** 获取默认部件 (列表第一个) */
  getDefaultPart: () => ModelPart | null;
}

export const usePartStore = create<PartState>((set, get) => ({
  parts: [],
  partsLoading: false,
  partsError: null,
  selectedPart: null,
  partColorMap: {},

  fetchParts: async (modelId: string) => {
    // S-5: 切换车型时重置部件颜色映射和选中状态
    set({ partsLoading: true, partsError: null, partColorMap: {}, selectedPart: null });
    try {
      const data = await fetchModelParts(modelId);
      const parts = data.parts;
      set({
        parts,
        partsLoading: false,
        // 默认选中第一个部件
        selectedPart: parts.length > 0 ? parts[0] : null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '部件数据加载失败';
      set({ partsLoading: false, partsError: message });
    }
  },

  selectPart: (part: ModelPart) => {
    set({ selectedPart: part });
  },

  setPartColor: (partCode: string, hex: string) => {
    set({
      partColorMap: { ...get().partColorMap, [partCode]: hex },
    });
  },

  resetAllParts: () => {
    set({ partColorMap: {} });
  },

  getDefaultPart: () => {
    const { parts } = get();
    return parts.length > 0 ? parts[0] : null;
  },
}));
