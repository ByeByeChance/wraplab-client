/** 离线资源清单 (匹配服务器响应) */
export interface OfflineManifest {
  resources: ManifestResource[];
  generated_at: string;
  is_full: boolean;
}

/** 清单资源项 */
export interface ManifestResource {
  key: string;
  url: string;
  version: string;
  ttlSeconds: number;
  type: 'json' | 'image' | 'config';
}

/** 缓存条目 */
export interface CacheEntry {
  key: string;
  data: unknown;
  cachedAt: number;
  ttlSeconds: number;
  version: string;
  lastAccessedAt: number;
}

/** 同步操作 */
export interface SyncOperation {
  id: string;
  type: 'like' | 'favorite' | 'view';
  payload: Record<string, unknown>;
  createdAt: number;
}

/** LRU 节点 */
export interface LRUNode {
  key: string;
  size: number;
  lastAccessedAt: number;
}

/** OfflineIndicator 组件 Props */
export interface OfflineIndicatorProps {
  isOffline: boolean;
  isRecovering: boolean;
  isFirstOffline: boolean;
  onDismissGuide: () => void;
}
