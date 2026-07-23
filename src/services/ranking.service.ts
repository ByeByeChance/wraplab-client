import { getPaginated } from './request';
import type { RankingCaseItem, RankingParams , PaginatedData } from '../types';

/** 获取案例排行榜 */
export function getRanking(
  params: RankingParams & { page?: number; size?: number },
): Promise<PaginatedData<RankingCaseItem>> {
  return getPaginated<RankingCaseItem>('/cases/ranking', {
    type: params.type,
    period: params.period,
    page: params.page ?? 1,
    size: params.size ?? 20,
  } as Record<string, unknown>);
}
