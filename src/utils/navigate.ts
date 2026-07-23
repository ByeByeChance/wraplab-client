import Taro from '@tarojs/taro';

/** 跳转登录页 (清除页面栈) */
export function navigateToLogin(): void {
  Taro.redirectTo({ url: '/pages/auth/login' });
}

/** 跳转改色工作台 */
export function navigateToDesign(params: { modelId: string; configurationId?: string }): void {
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  Taro.navigateTo({ url: `/pages/design/index?${query}` });
}

/** 跳转车型选择 */
export function navigateToCarSelect(brandId?: string): void {
  const url = brandId
    ? `/pages/home/car-select?brandId=${encodeURIComponent(brandId)}`
    : '/pages/home/car-select';
  Taro.navigateTo({ url });
}

/** 跳转报价单 */
export function navigateToQuote(params: {
  modelId: string;
  swatchId: string;
  materialId: string;
  hex: string;
}): void {
  const query = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  Taro.navigateTo({ url: `/pages/design/quote?${query}` });
}

// Phase 4: new navigate functions

/** 跳转案例排行榜 */
export function navigateToRanking(params?: { period?: string; type?: string }): void {
  const query = params
    ? Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
        .join('&')
    : '';
  Taro.navigateTo({ url: `/pages/cases/ranking/index${query ? '?' + query : ''}` });
}

/** 跳转分享卡片生成页 */
export function navigateToShareCard(caseId: string): void {
  Taro.navigateTo({ url: `/pages/cases/share-card/index?caseId=${encodeURIComponent(caseId)}` });
}

/** 跳转 AR 预览页 */
export function navigateToArPreview(configurationId: string): void {
  Taro.navigateTo({ url: `/pages/design/ar-preview/index?configurationId=${encodeURIComponent(configurationId)}` });
}

/** 跳转案例评论页 */
export function navigateToComment(caseId: string): void {
  Taro.navigateTo({ url: `/pages/cases/comment/index?caseId=${encodeURIComponent(caseId)}` });
}

// Phase 5: new navigate functions

/** 跳转门店切换页 */
export function navigateToStoreSwitch(): void {
  Taro.navigateTo({ url: '/pages/profile/store-switch/index' });
}
