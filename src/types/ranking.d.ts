/** 排名维度 */
export type RankDimension = 'like_count' | 'view_count' | 'comment_count';

/** 排名周期 */
export type RankPeriod = 'daily' | 'weekly' | 'monthly';

/** 排行榜案例项 */
export interface RankingCaseItem {
  /** 排名 (1-based) */
  rank: number;
  /** 排名变化 (正数上升, 负数下降, 0 不变, undefined 新上榜) */
  rankChange?: number;
  caseId: string;
  title: string;
  coverUrl: string;
  carModelName: string;
  colorSummary: string;
  likeCount: number;
  viewCount: number;
  commentCount: number;
  storeName: string;
}

/** 排行榜查询参数 */
export interface RankingParams {
  type: RankDimension;
  period: RankPeriod;
  page?: number;
  size?: number;
}

/** 排名变化方向 */
export type RankChangeDirection = 'up' | 'down' | 'same' | 'new';
