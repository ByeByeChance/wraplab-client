/** USDZ 文件信息 */
export interface UsdzInfo {
  available: boolean;
  url: string;
  fileSizeBytes: number;
  generatedAt: string;
  localCachePath?: string;
}

/** USDZ 下载状态 */
export interface UsdzDownloadState {
  downloading: boolean;
  progress: number;
  error: string | null;
  localPath: string | null;
}
