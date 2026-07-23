import { request, getPaginated } from './request';
import type { PaginatedData } from '../types';

/** 案例列表项 */
export interface CaseListItem {
  id: string;
  title: string;
  coverImage: string;
  modelName: string;
  swatchName: string;
  hex: string;
  likes: number;
}

/** 案例详情 */
export interface CaseDetail {
  id: string;
  title: string;
  description: string;
  images: Array<{ url: string; type: 'cover' | 'detail' }>;
  configuration: {
    mode: 'FULL' | 'PART';
    model: { brandName: string; seriesName: string; modelName: string; year: number };
    swatch: { name: string; hex: string; brandName: string };
    material: { name: string };
    parts: Array<{ partCode: string; hex: string; swatchName: string }>;
  };
  price: { materialPrice: number; laborPrice: number; totalPrice: number };
  store: { id: string; name: string; address: string; logo: string; rating: number };
  stats: { likes: number; views: number; isLiked: boolean };
  createdAt: string;
}

/** 案例点赞响应 */
export interface CaseLikeResponse {
  likes: number;
  isLiked: boolean;
}

/** 案例列表查询参数 */
export interface CaseListParams {
  [key: string]: unknown;
  page?: number;
  limit?: number;
  sort?: 'latest' | 'popular';
  brandId?: string;
  seriesId?: string;
  /** Phase 5: 逗号分隔的 tag_ids */
  tags?: string;
}

/** 获取案例列表 (GET /api/v1/cases) */
export function getCases(params?: CaseListParams): Promise<PaginatedData<CaseListItem>> {
  return getPaginated<CaseListItem>('/cases', params);
}

/** 获取案例详情 (GET /api/v1/cases/:id) */
export function getCaseById(id: string): Promise<CaseDetail> {
  return request<CaseDetail>({
    url: `/cases/${encodeURIComponent(id)}`,
    method: 'GET',
  });
}

/** 点赞案例 (POST /api/v1/cases/:id/like) */
export function likeCase(id: string): Promise<CaseLikeResponse> {
  return request<CaseLikeResponse>({
    url: `/cases/${encodeURIComponent(id)}/like`,
    method: 'POST',
  });
}

/** 取消点赞案例 (DELETE /api/v1/cases/:id/like) */
export function unlikeCase(id: string): Promise<CaseLikeResponse> {
  return request<CaseLikeResponse>({
    url: `/cases/${encodeURIComponent(id)}/like`,
    method: 'DELETE',
  });
}
