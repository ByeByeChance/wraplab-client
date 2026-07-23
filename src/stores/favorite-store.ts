import { create } from 'zustand';
import {
  getFavorites as fetchFavoriteList,
  addFavorite as apiAddFavorite,
  removeFavorite as apiRemoveFavorite,
} from '../services/favorite.service';
import type { FavoriteItem, FavoriteListParams } from '../services/favorite.service';

interface FavoriteState {
  /** 收藏列表 */
  favorites: FavoriteItem[];
  favoritesLoading: boolean;
  favoritesError: string | null;
  page: number;
  hasMore: boolean;

  /**
   * B-9: 三态乐观更新缓存
   * - 有键且值为 true  -> 乐观添加 (覆盖服务端数据)
   * - 有键且值为 false -> 乐观删除 (覆盖服务端数据, 不应出现在列表中)
   * - 无键             -> 使用服务端数据
   */
  optimisticMap: Record<string, boolean>;

  /** S-3: 记录最近一次查询参数 */
  lastFetchParams: FavoriteListParams | null;

  /** 获取收藏列表 */
  fetchFavorites: (params?: FavoriteListParams) => Promise<void>;
  /** 加载更多收藏 */
  fetchMoreFavorites: () => Promise<void>;
  /** 下拉刷新收藏列表 */
  refreshFavorites: () => Promise<void>;

  /**
   * 添加收藏 (乐观更新)
   * @returns true 表示成功
   */
  addFavorite: (configId: string) => Promise<boolean>;
  /**
   * 取消收藏 (乐观更新)
   * @returns true 表示成功
   */
  removeFavorite: (configId: string) => Promise<boolean>;
  /** 检查是否已收藏 (结合 API 数据 + 乐观缓存) */
  isFavorited: (targetId: string) => boolean;
}

export const useFavoriteStore = create<FavoriteState>((set, get) => ({
  favorites: [],
  favoritesLoading: false,
  favoritesError: null,
  page: 1,
  hasMore: true,
  optimisticMap: {},
  lastFetchParams: null,

  fetchFavorites: async (params?: FavoriteListParams) => {
    // S-3: 记录最近查询参数
    set({ lastFetchParams: params ?? null, favoritesLoading: true, favoritesError: null });
    try {
      const data = await fetchFavoriteList(params);
      set({
        favorites: data.items,
        page: data.page,
        hasMore: data.items.length < data.total,
        favoritesLoading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '收藏加载失败';
      set({ favoritesLoading: false, favoritesError: message });
    }
  },

  fetchMoreFavorites: async () => {
    const { favorites, page, hasMore, favoritesLoading } = get();
    if (!hasMore || favoritesLoading) return;

    const nextPage = page + 1;
    try {
      const data = await fetchFavoriteList({ page: nextPage });
      set({
        favorites: [...favorites, ...data.items],
        page: data.page,
        hasMore: favorites.length + data.items.length < data.total,
      });
    } catch {
      // 加载更多静默失败
    }
  },

  // S-3: refreshFavorites 复用上次查询参数
  refreshFavorites: async () => {
    const { lastFetchParams } = get();
    set({ page: 1, hasMore: true });
    await get().fetchFavorites({ ...lastFetchParams, page: 1 });
  },

  // B-9: 乐观添加 — optimisticMap[configId] = true
  addFavorite: async (configId: string) => {
    // 乐观更新: 设置 flag 为 true
    set({ optimisticMap: { ...get().optimisticMap, [configId]: true } });

    try {
      await apiAddFavorite(configId);
      return true;
    } catch {
      // 回滚: 删除此键 (回到"使用服务端数据"状态)
      const nextMap = { ...get().optimisticMap };
      delete nextMap[configId];
      set({ optimisticMap: nextMap });
      return false;
    }
  },

  // B-9: 乐观删除 — optimisticMap[configId] = false
  removeFavorite: async (configId: string) => {
    // B-9: 保留旧值用于回滚
    const previousValue = get().optimisticMap[configId];
    // B-9: 设置为 false (而非删除键)，isFavorited 据此排除该项
    set({ optimisticMap: { ...get().optimisticMap, [configId]: false } });

    try {
      await apiRemoveFavorite(configId);
      return true;
    } catch {
      // 回滚: 恢复旧值 (不存在则为 undefined，即删除键)
      const nextMap = { ...get().optimisticMap };
      if (previousValue === undefined) {
        delete nextMap[configId];
      } else {
        nextMap[configId] = previousValue;
      }
      set({ optimisticMap: nextMap });
      return false;
    }
  },

  // B-9: 三态判断
  // - optimisticMap[targetId] === true  -> 已收藏 (乐观添加)
  // - optimisticMap[targetId] === false -> 未收藏 (乐观删除, 虽服务端列表可能仍有该项)
  // - 无键 -> 回退到服务端数据 (favorites[])
  isFavorited: (targetId: string) => {
    const optimisticValue = get().optimisticMap[targetId];
    if (optimisticValue !== undefined) {
      // B-9: 有乐观标记，以乐观标记为准
      return optimisticValue;
    }
    // 无乐观标记，使用服务端数据
    return get().favorites.some((f) => f.targetId === targetId);
  },
}));
