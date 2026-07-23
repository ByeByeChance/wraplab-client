import { request } from './request';

/** 分享卡片数据 */
export interface ShareCardData {
  /** 案例封面图 URL */
  coverUrl: string;
  /** 案例标题 (最多 2 行) */
  title: string;
  /** 车型颜色摘要 */
  subtitle: string;
  /** 门店 Logo URL */
  storeLogoUrl?: string;
  /** 门店名称 */
  storeName: string;
  /** 小程序码图片 URL */
  qrCodeUrl: string;
}

/** 获取分享卡片数据 */
export function getShareCardData(caseId: string): Promise<ShareCardData> {
  return request<ShareCardData>({
    url: `/cases/${encodeURIComponent(caseId)}/share-card`,
    method: 'GET',
  });
}
