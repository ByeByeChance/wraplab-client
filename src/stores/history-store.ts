import { create } from 'zustand';
import { historyService } from '../services';
import type {
  HistoryConfig,
  HistoryQuote,
  QuoteDetail,
} from '../types/phase3';

interface HistoryState {
  // 改色历史
  configs: HistoryConfig[];
  configsLoading: boolean;
  configsError: string | null;
  configsPage: number;
  configsHasMore: boolean;
  configsRefreshing: boolean;

  // 报价历史
  quotes: HistoryQuote[];
  quotesLoading: boolean;
  quotesError: string | null;
  quotesPage: number;
  quotesHasMore: boolean;
  quotesRefreshing: boolean;

  // 当前查看的报价详情
  quoteDetail: QuoteDetail | null;
  quoteDetailLoading: boolean;
  quoteDetailError: string | null;

  // 日期筛选
  dateRange: {
    startDate?: string;
    endDate?: string;
    preset: string;
  };

  // Actions
  setDateRange: (range: {
    startDate?: string;
    endDate?: string;
    preset: string;
  }) => void;
  fetchConfigHistory: (params?: {
    page?: number;
    size?: number;
    startDate?: string;
    endDate?: string;
  }) => Promise<void>;
  fetchQuoteHistory: (params?: {
    page?: number;
    size?: number;
    startDate?: string;
    endDate?: string;
  }) => Promise<void>;
  fetchQuoteDetail: (quoteId: string) => Promise<void>;
  loadMoreConfigs: () => Promise<void>;
  loadMoreQuotes: () => Promise<void>;
  refreshConfigs: () => Promise<void>;
  refreshQuotes: () => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  configs: [],
  configsLoading: false,
  configsError: null,
  configsPage: 1,
  configsHasMore: false,
  configsRefreshing: false,

  quotes: [],
  quotesLoading: false,
  quotesError: null,
  quotesPage: 1,
  quotesHasMore: false,
  quotesRefreshing: false,

  quoteDetail: null,
  quoteDetailLoading: false,
  quoteDetailError: null,

  dateRange: { preset: 'all' },

  setDateRange: (range) => {
    set({ dateRange: range, configsPage: 1, quotesPage: 1 });
  },

  fetchConfigHistory: async (params) => {
    const { configs } = get();
    const isFirstPage = !params?.page || params.page === 1;
    if (isFirstPage && configs.length === 0) {
      set({ configsLoading: true, configsError: null });
    }
    try {
      const data = await historyService.getConfigHistory({
        page: params?.page ?? get().configsPage,
        size: params?.size ?? 20,
        startDate: params?.startDate ?? get().dateRange.startDate,
        endDate: params?.endDate ?? get().dateRange.endDate,
      });
      const updated = isFirstPage
        ? data.items
        : [...get().configs, ...data.items];
      set({
        configs: updated,
        configsLoading: false,
        configsError: null,
        configsPage: data.page,
        configsHasMore: updated.length < data.total,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '方案历史加载失败';
      set({ configsLoading: false, configsError: message });
    }
  },

  fetchQuoteHistory: async (params) => {
    const { quotes } = get();
    const isFirstPage = !params?.page || params.page === 1;
    if (isFirstPage && quotes.length === 0) {
      set({ quotesLoading: true, quotesError: null });
    }
    try {
      const data = await historyService.getQuoteHistory({
        page: params?.page ?? get().quotesPage,
        size: params?.size ?? 20,
        startDate: params?.startDate ?? get().dateRange.startDate,
        endDate: params?.endDate ?? get().dateRange.endDate,
      });
      const updated = isFirstPage
        ? data.items
        : [...get().quotes, ...data.items];
      set({
        quotes: updated,
        quotesLoading: false,
        quotesError: null,
        quotesPage: data.page,
        quotesHasMore: updated.length < data.total,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '报价历史加载失败';
      set({ quotesLoading: false, quotesError: message });
    }
  },

  fetchQuoteDetail: async (quoteId: string) => {
    set({ quoteDetailLoading: true, quoteDetailError: null });
    try {
      const data = await historyService.getQuoteDetail(quoteId);
      set({
        quoteDetail: data,
        quoteDetailLoading: false,
        quoteDetailError: null,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '报价详情加载失败';
      set({ quoteDetailLoading: false, quoteDetailError: message });
    }
  },

  loadMoreConfigs: async () => {
    const { configsHasMore, configsLoading } = get();
    if (!configsHasMore || configsLoading) return;
    const nextPage = get().configsPage + 1;
    await get().fetchConfigHistory({ page: nextPage });
  },

  loadMoreQuotes: async () => {
    const { quotesHasMore, quotesLoading } = get();
    if (!quotesHasMore || quotesLoading) return;
    const nextPage = get().quotesPage + 1;
    await get().fetchQuoteHistory({ page: nextPage });
  },

  refreshConfigs: async () => {
    set({ configsRefreshing: true, configsError: null });
    try {
      const data = await historyService.getConfigHistory({
        page: 1,
        size: 20,
        startDate: get().dateRange.startDate,
        endDate: get().dateRange.endDate,
      });
      set({
        configs: data.items,
        configsRefreshing: false,
        configsPage: 1,
        configsHasMore: data.items.length < data.total,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '方案历史刷新失败';
      set({
        configsError: message,
        configsRefreshing: false,
      });
    }
  },

  refreshQuotes: async () => {
    set({ quotesRefreshing: true, quotesError: null });
    try {
      const data = await historyService.getQuoteHistory({
        page: 1,
        size: 20,
        startDate: get().dateRange.startDate,
        endDate: get().dateRange.endDate,
      });
      set({
        quotes: data.items,
        quotesRefreshing: false,
        quotesPage: 1,
        quotesHasMore: data.items.length < data.total,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '报价历史刷新失败';
      set({
        quotesError: message,
        quotesRefreshing: false,
      });
    }
  },
}));
