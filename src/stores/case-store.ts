import { create } from 'zustand';
import { getCases as fetchCaseList, getCaseById, likeCase, unlikeCase } from '../services/case.service';
import { ApiError } from '../services/request';
import type { CaseListItem, CaseDetail, CaseListParams } from '../services/case.service';

interface CaseState {
  /** 案例列表 */
  cases: CaseListItem[];
  casesLoading: boolean;
  casesError: string | null;
  casesPage: number;
  casesHasMore: boolean;

  /** 案例详情 */
  currentCase: CaseDetail | null;
  detailLoading: boolean;
  detailError: string | null;

  /** S-2: 记录最近一次查询参数，refreshCases 时复用 */
  lastFetchParams: CaseListParams | null;

  /** 获取案例列表 (首页刷新/筛选) */
  fetchCases: (params?: CaseListParams) => Promise<void>;
  /** 加载更多案例 (滚动到底部) */
  fetchMoreCases: (params?: Omit<CaseListParams, 'page'>) => Promise<void>;
  /** 下拉刷新案例列表 */
  refreshCases: () => Promise<void>;
  /** 获取案例详情 */
  fetchCaseDetail: (caseId: string) => Promise<void>;
  /** 切换点赞状态 */
  toggleLike: (caseId: string) => Promise<{ likes: number; isLiked: boolean }>;
}

export const useCaseStore = create<CaseState>((set, get) => ({
  cases: [],
  casesLoading: false,
  casesError: null,
  casesPage: 1,
  casesHasMore: true,

  currentCase: null,
  detailLoading: false,
  detailError: null,

  lastFetchParams: null,

  fetchCases: async (params?: CaseListParams) => {
    // S-2: 记录最近查询参数
    set({ lastFetchParams: params ?? null, casesLoading: true, casesError: null });
    try {
      const data = await fetchCaseList(params);
      set({
        cases: data.items,
        casesPage: data.page,
        casesHasMore: data.items.length < data.total,
        casesLoading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '案例加载失败';
      set({ casesLoading: false, casesError: message });
    }
  },

  fetchMoreCases: async (params?: Omit<CaseListParams, 'page'>) => {
    const { cases, casesPage, casesHasMore, casesLoading } = get();
    if (!casesHasMore || casesLoading) return;

    const nextPage = casesPage + 1;
    try {
      const data = await fetchCaseList({ ...params, page: nextPage });
      set({
        cases: [...cases, ...data.items],
        casesPage: data.page,
        casesHasMore: cases.length + data.items.length < data.total,
      });
    } catch {
      // 加载更多静默失败，保留已加载数据
    }
  },

  // S-2: refreshCases 复用上次查询参数
  refreshCases: async () => {
    const { lastFetchParams } = get();
    set({ casesPage: 1, casesHasMore: true });
    await get().fetchCases({ ...lastFetchParams, page: 1 });
  },

  // S-1: 直接重新抛出 ApiError 以保留原始错误类型
  fetchCaseDetail: async (caseId: string) => {
    set({ detailLoading: true, detailError: null });
    try {
      const detail = await getCaseById(caseId);
      set({ currentCase: detail, detailLoading: false });
    } catch (error) {
      // S-1: ApiError 直接抛出，保留业务错误码
      if (error instanceof ApiError) {
        set({ detailLoading: false, detailError: error.message });
        throw error;
      }
      const message = error instanceof Error ? error.message : '案例详情加载失败';
      set({ detailLoading: false, detailError: message });
    }
  },

  // B-8: 使用专门变量捕获乐观更新前的 isLiked，避免回滚时引用过时的 store 状态
  toggleLike: async (caseId: string) => {
    const { currentCase } = get();

    try {
      // 乐观更新详情中的点赞状态
      if (currentCase && currentCase.id === caseId) {
        // B-8: 捕获乐观更新前的原始 isLiked 值
        const wasLiked = currentCase.stats.isLiked;
        const newIsLiked = !wasLiked;
        set({
          currentCase: {
            ...currentCase,
            stats: {
              ...currentCase.stats,
              isLiked: newIsLiked,
              likes: currentCase.stats.likes + (newIsLiked ? 1 : -1),
            },
          },
        });

        try {
          // B-8: 基于原始 wasLiked 决定 API 操作
          const result = await (wasLiked ? unlikeCase(caseId) : likeCase(caseId));
          return result;
        } catch {
          // B-8: 回滚到原始状态 (用捕获的 wasLiked)
          set({
            currentCase: {
              ...currentCase,
              stats: {
                ...currentCase.stats,
                isLiked: wasLiked,
                likes: currentCase.stats.likes,
              },
            },
          });
          throw new Error('操作失败，请重试');
        }
      }

      // 列表项点赞 (无详情上下文)
      return await likeCase(caseId);
    } catch (error) {
      const message = error instanceof Error ? error.message : '操作失败';
      throw new Error(message);
    }
  },
}));
