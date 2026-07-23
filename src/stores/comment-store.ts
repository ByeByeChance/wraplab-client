import { create } from 'zustand';
import Taro from '@tarojs/taro';
import {
  getComments,
  postComment as apiPostComment,
  deleteComment as apiDeleteComment,
  approveComment as apiApproveComment,
  rejectComment as apiRejectComment,
  voteComment as apiVoteComment,
} from '../services/comment.service';
import { COMMENT_COOLDOWN_MS } from '../utils/constants';
import type { CommentItem } from '../types';

const COMMENT_LAST_AT_KEY = 'wraplab_comment_last_at';

/** Shared helper: start a cooldown countdown timer that updates state every second. */
function startCooldownTimer(
  initialSeconds: number,
  set: (partial: Partial<CommentState>) => void,
  getTimerId: () => ReturnType<typeof setInterval> | null,
  setTimerId: (id: ReturnType<typeof setInterval> | null) => void,
): void {
  const existingTimer = getTimerId();
  if (existingTimer) clearInterval(existingTimer);

  let seconds = initialSeconds;
  const timer = setInterval(() => {
    seconds -= 1;
    if (seconds <= 0) {
      clearInterval(timer);
      setTimerId(null);
      set({ cooldownSeconds: 0 });
    } else {
      set({ cooldownSeconds: seconds });
    }
  }, 1000);
  setTimerId(timer);
}

interface CommentState {
  /** 评论列表 */
  comments: CommentItem[];
  /** 分页状态 */
  page: number;
  hasMore: boolean;
  /** 加载状态 */
  loading: boolean;
  error: string | null;
  /** 提交状态 */
  submitting: boolean;
  submitError: string | null;
  /** 限频冷却剩余秒数 (0 = 无限制) */
  cooldownSeconds: number;
  /** 最后评论时间戳 */
  lastCommentAt: number | null;
  /** 管理员审核目标 */
  adminReviewTarget: string | null;
  /** 冷却计时器 ID (用于清理) */
  _cooldownTimerId: ReturnType<typeof setInterval> | null;

  // Actions
  fetchComments: (caseId: string, page?: number) => Promise<void>;
  loadMoreComments: (caseId: string) => Promise<void>;
  postComment: (caseId: string, content: string, parentId?: string) => Promise<void>;
  deleteComment: (caseId: string, commentId: string) => Promise<void>;
  approveComment: (commentId: string) => Promise<void>;
  rejectComment: (commentId: string) => Promise<void>;
  reset: () => void;
  restoreCooldown: () => void;

  // Phase 5: 评论赞
  toggleVote: (commentId: string) => Promise<void>;
}

export const useCommentStore = create<CommentState>((set, get) => ({
  comments: [],
  page: 1,
  hasMore: true,
  loading: false,
  error: null,
  submitting: false,
  submitError: null,
  cooldownSeconds: 0,
  lastCommentAt: null,
  adminReviewTarget: null,
  _cooldownTimerId: null,

  fetchComments: async (caseId: string, page = 1) => {
    set({ loading: true, error: null });
    try {
      const data = await getComments(caseId, { page, size: 20 });
      set({
        comments: data.items,
        page: data.page,
        hasMore: data.items.length < data.total,
        loading: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '评论加载失败';
      set({ loading: false, error: message });
    }
  },

  loadMoreComments: async (caseId: string) => {
    const { comments, page, hasMore, loading } = get();
    if (!hasMore || loading) return;

    const nextPage = page + 1;
    try {
      const data = await getComments(caseId, { page: nextPage, size: 20 });
      set({
        comments: [...comments, ...data.items],
        page: data.page,
        hasMore: comments.length + data.items.length < data.total,
      });
    } catch {
      // 加载更多静默失败
    }
  },

  postComment: async (caseId: string, content: string, parentId?: string) => {
    const tempId = `temp_${Date.now()}`;
    const tempComment: CommentItem = {
      id: tempId,
      authorName: '',
      content,
      createdAt: new Date().toISOString(),
      likeCount: 0,
      isLiked: false,
      voteCount: 0,
      isVoted: false,
      status: 'pending',
      replyCount: 0,
    };

    // 乐观插入
    set((state) => ({
      comments: [tempComment, ...state.comments],
      submitting: true,
      submitError: null,
    }));

    try {
      const realComment = await apiPostComment(caseId, { content, parent_id: parentId });
      // 用真实数据替换临时项
      set((state) => ({
        comments: state.comments.map((c) => (c.id === tempId ? realComment : c)),
        submitting: false,
      }));
      // 启动冷却
      const lastAt = Date.now();
      Taro.setStorageSync(COMMENT_LAST_AT_KEY, lastAt);
      set({ lastCommentAt: lastAt, cooldownSeconds: 30 });
      startCooldownTimer(
        30,
        set,
        () => get()._cooldownTimerId,
        (id) => set({ _cooldownTimerId: id }),
      );
    } catch {
      // 移除临时项
      set((state) => ({
        comments: state.comments.filter((c) => c.id !== tempId),
        submitting: false,
        submitError: '评论发送失败，请重试',
      }));
      Taro.showToast({ title: '评论发送失败，请重试', icon: 'none' });
      // 仍然启动冷却
      const lastAt = Date.now();
      Taro.setStorageSync(COMMENT_LAST_AT_KEY, lastAt);
      set({ lastCommentAt: lastAt, cooldownSeconds: 30 });
      startCooldownTimer(
        30,
        set,
        () => get()._cooldownTimerId,
        (id) => set({ _cooldownTimerId: id }),
      );
    }
  },

  deleteComment: async (caseId: string, commentId: string) => {
    try {
      await apiDeleteComment(caseId, commentId);
      set((state) => ({
        comments: state.comments.filter((c) => c.id !== commentId),
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : '删除失败，请重试';
      Taro.showToast({ title: message, icon: 'none' });
    }
  },

  approveComment: async (commentId: string) => {
    try {
      await apiApproveComment(commentId);
      set((state) => ({
        comments: state.comments.map((c) =>
          c.id === commentId ? { ...c, status: 'approved' as const } : c,
        ),
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : '审核操作失败';
      Taro.showToast({ title: message, icon: 'none' });
    }
  },

  rejectComment: async (commentId: string) => {
    try {
      await apiRejectComment(commentId);
      set((state) => ({
        comments: state.comments.map((c) =>
          c.id === commentId ? { ...c, status: 'rejected' as const } : c,
        ),
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : '审核操作失败';
      Taro.showToast({ title: message, icon: 'none' });
    }
  },

  reset: () => {
    const { _cooldownTimerId } = get();
    if (_cooldownTimerId) {
      clearInterval(_cooldownTimerId);
    }
    set({
      comments: [],
      page: 1,
      hasMore: true,
      loading: false,
      error: null,
      submitting: false,
      submitError: null,
      cooldownSeconds: 0,
      adminReviewTarget: null,
      _cooldownTimerId: null,
    });
  },

  restoreCooldown: () => {
    const lastAt = Taro.getStorageSync(COMMENT_LAST_AT_KEY) as number | null;
    if (lastAt) {
      const elapsed = Date.now() - lastAt;
      const remaining = Math.max(0, Math.ceil((COMMENT_COOLDOWN_MS - elapsed) / 1000));
      if (remaining > 0) {
        set({ lastCommentAt: lastAt, cooldownSeconds: remaining });
        startCooldownTimer(
          remaining,
          set,
          () => get()._cooldownTimerId,
          (id) => set({ _cooldownTimerId: id }),
        );
      }
    }
  },

  // Phase 5: 评论赞 (乐观更新 + 服务器权威值覆盖)
  toggleVote: async (commentId: string) => {
    const prevComments = get().comments;

    // 在评论树中查找并更新
    const updateVoteInTree = (items: CommentItem[]): CommentItem[] =>
      items.map((item) => {
        if (item.id === commentId) {
          const newIsVoted = !item.isVoted;
          const newVoteCount = (item.voteCount || 0) + (newIsVoted ? 1 : -1);
          return { ...item, isVoted: newIsVoted, voteCount: Math.max(0, newVoteCount) };
        }
        if (item.replies && item.replies.length > 0) {
          return { ...item, replies: updateVoteInTree(item.replies) };
        }
        return item;
      });

    // 乐观更新
    set((state) => ({ comments: updateVoteInTree(state.comments) }));

    try {
      const serverResult = await apiVoteComment(commentId);
      // SF-1: Override optimistic update with server's authoritative values
      const applyServerVote = (items: CommentItem[]): CommentItem[] =>
        items.map((item) => {
          if (item.id === commentId) {
            return {
              ...item,
              voteCount: serverResult.vote_count,
              isVoted: serverResult.is_voted,
            };
          }
          if (item.replies && item.replies.length > 0) {
            return { ...item, replies: applyServerVote(item.replies) };
          }
          return item;
        });
      set((state) => ({ comments: applyServerVote(state.comments) }));
    } catch (err) {
      // 回滚
      set({ comments: prevComments });
      if (err instanceof Error && err.message.includes('401')) {
        Taro.showToast({ title: '请先登录后点赞', icon: 'none' });
        Taro.navigateTo({ url: '/pages/auth/login' });
      } else if (err instanceof Error && err.message.includes('429')) {
        Taro.showToast({ title: '点赞过于频繁，请稍后再试', icon: 'none' });
      } else {
        Taro.showToast({ title: '操作失败，请重试', icon: 'none' });
      }
    }
  },
}));
