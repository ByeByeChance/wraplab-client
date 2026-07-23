import { request } from './request';
import type { MaterialDetail } from '../types/phase3';

/** 获取材质列表 (Phase 3 扩展版: 带详细属性) */
export async function getMaterials(): Promise<{
  items: MaterialDetail[];
  total: number;
}> {
  return request<{
    items: MaterialDetail[];
    total: number;
  }>({
    url: '/colors/materials',
    method: 'GET',
  });
}
