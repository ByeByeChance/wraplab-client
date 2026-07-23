import { request } from './request';
import type { OfflineManifest } from '../types';

/** 获取离线缓存清单 */
export function getManifest(since?: string): Promise<OfflineManifest> {
  const query = since ? `?since=${encodeURIComponent(since)}` : '';
  return request<OfflineManifest>({
    url: `/offline/manifest${query}`,
    method: 'GET',
  });
}
