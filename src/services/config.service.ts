import { request, getPaginated } from './request';
import type { Configuration, PaginatedData } from '..//types';
import type { PaginationParams } from './request';

/** 创建方案请求 */
interface CreateConfigRequest {
  modelId: string;
  swatchId?: string;
  materialId?: string;
  hex?: string;
  thumbnail?: string;
}

/** 创建改色方案 */
export function createConfiguration(data: CreateConfigRequest): Promise<Configuration> {
  return request<Configuration>({
    url: '/configurations',
    method: 'POST',
    data,
  });
}

/** 获取历史方案列表 (分页) */
export function getConfigurations(
  params?: PaginationParams & Record<string, unknown>,
): Promise<PaginatedData<Configuration>> {
  return getPaginated<Configuration>('/configurations', params);
}

/** 获取单个方案详情 (用于恢复方案) */
export function getConfigurationById(id: string): Promise<Configuration> {
  return request<Configuration>({
    url: `/configurations/${encodeURIComponent(id)}`,
    method: 'GET',
  });
}

/** 部件项 (含面积) */
export interface PartItem {
  part_code: string;
  part_name: string;
  area_m2: number;
  default_color_swatch_id?: string;
}

/** 获取车型部件列表 (含面积 area_m2) */
export function getParts(modelId: string): Promise<PartItem[]> {
  return request<PartItem[]>({
    url: `/vehicles/models/${encodeURIComponent(modelId)}/parts`,
    method: 'GET',
  });
}
