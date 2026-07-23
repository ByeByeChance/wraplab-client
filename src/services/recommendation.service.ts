import { request } from './request';
import type { RecommendCase } from '../types';

/** 获取案例推荐列表 */
export function getRecommendations(
  caseId: string,
  params?: { limit?: number; store_id?: string },
): Promise<RecommendCase[]> {
  const query = Object.entries(params || {})
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  return request<RecommendCase[]>({
    url: `/cases/${encodeURIComponent(caseId)}/recommendations${query ? `?${query}` : ''}`,
    method: 'GET',
  });
}
