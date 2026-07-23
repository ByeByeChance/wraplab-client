/** 评论状态 */
export type CommentStatus = 'approved' | 'pending' | 'rejected';

/** 评论项 */
export interface CommentItem {
  id: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
  /** 点赞数 (Phase 5 启用) */
  likeCount: number;
  /** 是否已点赞 (Phase 5 启用) */
  isLiked: boolean;
  /** Phase 5: 赞数 */
  voteCount: number;
  /** Phase 5: 当前用户是否已赞 */
  isVoted: boolean;
  /** 审核状态 */
  status: CommentStatus;
  /** 嵌套回复 (最多 2 层) */
  replies?: CommentItem[];
  /** 回复总数 (大于 replies.length 时显示"查看更多") */
  replyCount: number;
  /** 回复目标用户名 */
  replyToUserName?: string;
}

/** 回复项 */
export interface Reply {
  id: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
  replyToUserName: string;
  status: CommentStatus;
}

/** 评论列表分页数据 */
export interface CommentPaginatedData {
  items: CommentItem[];
  total: number;
  page: number;
  pageSize: number;
}
