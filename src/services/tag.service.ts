import { request } from './request';
import type { Tag } from '../types';

/** 获取标签列表 */
export function getTags(storeId: string): Promise<Tag[]> {
  return request<Tag[]>({
    url: '/tags',
    method: 'GET',
    data: { store_id: storeId },
  });
}
