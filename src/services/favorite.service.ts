import { request, getPaginated } from './request';
import type { PaginatedData } from '../types';

/** 收藏项 */
export interface FavoriteItem {
  id: string;
  targetType: 'case' | 'configuration';
  targetId: string;
  target: {
    thumbnail: string;
    title: string;
    swatch: { hex: string; name: string; brandName: string };
  };
  createdAt: string;
}

/** 收藏列表查询参数 */
export interface FavoriteListParams {
  [key: string]: unknown;
  page?: number;
  limit?: number;
}

/** 获取收藏列表 (GET /api/v1/favorites) */
export function getFavorites(params?: FavoriteListParams): Promise<PaginatedData<FavoriteItem>> {
  return getPaginated<FavoriteItem>('/favorites', params);
}

/** 添加收藏 (POST /api/v1/favorites/:configId) */
export function addFavorite(configId: string): Promise<void> {
  return request<void>({
    url: `/favorites/${encodeURIComponent(configId)}`,
    method: 'POST',
  });
}

/** 取消收藏 (DELETE /api/v1/favorites/:configId) */
export function removeFavorite(configId: string): Promise<void> {
  return request<void>({
    url: `/favorites/${encodeURIComponent(configId)}`,
    method: 'DELETE',
  });
}
