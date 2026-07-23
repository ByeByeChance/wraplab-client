import { request } from './request';
import type { UsdzInfo } from '../types';

/** 查询车型 USDZ 文件信息 */
export function getUsdzInfo(modelId: string): Promise<UsdzInfo> {
  return request<UsdzInfo>({
    url: `/vehicles/models/${encodeURIComponent(modelId)}/usdz`,
    method: 'GET',
  });
}
