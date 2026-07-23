import { request } from './request';

/** AR 纹理配置 */
export interface ArTextureConfig {
  /** 默认颜色 HEX */
  defaultHex: string;
  /** AR 模型 URL (glTF/USDZ) */
  arModelUrl: string;
  /** 材质映射: 部件代码 -> 可替换颜色列表 */
  materialMap?: Record<string, { hexList: string[]; materialId: string }>;
}

/** 获取 AR 纹理/模型配置 */
export function getArTexture(configId: string): Promise<ArTextureConfig> {
  return request<ArTextureConfig>({
    url: `/configurations/${encodeURIComponent(configId)}/ar-texture`,
    method: 'GET',
  });
}
