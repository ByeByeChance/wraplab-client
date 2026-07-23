import { create } from 'zustand';
import { configService, quoteService } from '../services';
import type { Model, Quote } from '../types';

interface CustomerInfo {
  name: string;
  phone: string;
  remark?: string;
}

interface SaveConfigParams {
  modelId: string;
  swatchId?: string;
  materialId?: string;
  hex?: string;
  thumbnail?: string;
}

interface ConfigState {
  /** 当前改色方案的车型 */
  currentModel: Model | null;

  /** 当前方案 ID (恢复历史方案时存在) */
  configurationId: string | null;

  /** 当前方案缩略图 (来自 H5 截图 base64) */
  thumbnail: string | null;

  /** 报价单数据 */
  quoteData: Quote | null;
  quoteLoading: boolean;
  quoteError: string | null;

  /** 设置当前车型 */
  setModel: (model: Model) => void;
  /** 加载已有方案 */
  loadConfiguration: (configId: string) => Promise<void>;
  /** 保存当前方案 */
  saveConfiguration: (params: SaveConfigParams) => Promise<string>;
  /** 设置缩略图 */
  setThumbnail: (base64: string) => void;
  /** 生成报价 */
  generateQuote: (configId: string, customer: CustomerInfo) => Promise<Quote>;
  /** 重置当前方案状态 */
  reset: () => void;
}

export const useConfigStore = create<ConfigState>((set) => ({
  currentModel: null,
  configurationId: null,
  thumbnail: null,

  quoteData: null,
  quoteLoading: false,
  quoteError: null,

  setModel: (model: Model) => {
    set({ currentModel: model, configurationId: null, thumbnail: null });
  },

  loadConfiguration: async (configId: string) => {
    try {
      const config = await configService.getConfigurationById(configId);
      set({
        configurationId: config.id,
        thumbnail: config.thumbnail || null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '方案加载失败';
      throw new Error(message);
    }
  },

  saveConfiguration: async (params: SaveConfigParams): Promise<string> => {
    const config = await configService.createConfiguration(params);
    set({ configurationId: config.id, thumbnail: config.thumbnail || null });
    return config.id;
  },

  setThumbnail: (base64: string) => {
    set({ thumbnail: base64 });
  },

  generateQuote: async (configId: string, customer: CustomerInfo): Promise<Quote> => {
    set({ quoteLoading: true, quoteError: null });
    try {
      const quote = await quoteService.createQuote({
        configurationId: configId,
        customerName: customer.name,
        customerPhone: customer.phone,
        remark: customer.remark,
      });
      set({ quoteData: quote, quoteLoading: false });
      return quote;
    } catch (error) {
      const message = error instanceof Error ? error.message : '报价生成失败';
      set({ quoteLoading: false, quoteError: message });
      throw error;
    }
  },

  reset: () => {
    set({
      currentModel: null,
      configurationId: null,
      thumbnail: null,
      quoteData: null,
      quoteLoading: false,
      quoteError: null,
    });
  },
}));
