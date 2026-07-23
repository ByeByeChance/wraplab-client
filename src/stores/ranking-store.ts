import { create } from 'zustand';
import Taro from '@tarojs/taro';
import { getRanking } from '../services/ranking.service';
import { RANKING_CACHE_TTL } from '../utils/constants';
import type { RankingCaseItem, RankPeriod, RankDimension } from '../types';

const RANKING_CACHE_KEY = 'wraplab_ranking_cache';

interface RankingState {
  /** 当前周期 */
  period: RankPeriod;
  /** 当前排序维度 */
  sortType: RankDimension;
  /** 排行数据 */
  rankingList: RankingCaseItem[];
  /** 分页 */
  page: number;
  hasMore: boolean;
  /** 加载状态 */
  loading: boolean;
  error: string | null;
  /** 下拉刷新状态 */
  refreshing: boolean;

  // Actions
  setPeriod: (period: RankPeriod) => void;
  setSortType: (type: RankDimension) => void;
  fetchRanking: (params?: { page?: number }) => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
}

export const useRankingStore = create<RankingState>((set, get) => ({
  period: 'weekly',
  sortType: 'like_count',
  rankingList: [],
  page: 1,
  hasMore: true,
  loading: false,
  error: null,
  refreshing: false,

  setPeriod: (period: RankPeriod) => {
    set({ period, page: 1, rankingList: [], hasMore: true });
    void get().fetchRanking({ page: 1 });
  },

  setSortType: (sortType: RankDimension) => {
    set({ sortType, page: 1, rankingList: [], hasMore: true });
    void get().fetchRanking({ page: 1 });
  },

  fetchRanking: async (params?: { page?: number }) => {
    const { period, sortType, page: currentPage } = get();
    const targetPage = params?.page ?? currentPage;
    const isFirstPage = targetPage === 1;

    if (isFirstPage) {
      // 检查缓存 (仅首页)
      const cached = Taro.getStorageSync(RANKING_CACHE_KEY) as {
        data: RankingCaseItem[];
        timestamp: number;
        cachedPeriod: RankPeriod;
        cachedType: RankDimension;
      } | null;

      if (
        cached &&
        cached.cachedPeriod === period &&
        cached.cachedType === sortType &&
        Date.now() - cached.timestamp < RANKING_CACHE_TTL
      ) {
        set({
          rankingList: cached.data,
          loading: false,
          refreshing: false,
        });
        return;
      }
    }

    set({ loading: true, error: null });
    try {
      const data = await getRanking({
        type: sortType,
        period,
        page: targetPage,
        size: 20,
      });
      const newList = isFirstPage ? data.items : [...get().rankingList, ...data.items];
      set({
        rankingList: newList,
        page: data.page,
        hasMore: data.items.length < data.total,
        loading: false,
        refreshing: false,
      });

      // 首页缓存
      if (isFirstPage) {
        Taro.setStorageSync(RANKING_CACHE_KEY, {
          data: data.items,
          timestamp: Date.now(),
          cachedPeriod: period,
          cachedType: sortType,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '排行榜加载失败';
      set({ loading: false, refreshing: false, error: message });
    }
  },

  loadMore: async () => {
    const { page, hasMore, loading } = get();
    if (!hasMore || loading) return;
    await get().fetchRanking({ page: page + 1 });
  },

  refresh: async () => {
    set({ refreshing: true, page: 1 });
    await get().fetchRanking({ page: 1 });
  },

  reset: () => {
    set({
      period: 'weekly',
      sortType: 'like_count',
      rankingList: [],
      page: 1,
      hasMore: true,
      loading: false,
      error: null,
      refreshing: false,
    });
  },
}));
