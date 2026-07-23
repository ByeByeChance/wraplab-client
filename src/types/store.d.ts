/** 门店信息 (店员视角) */
export interface StoreInfo {
  storeId: string;
  name: string;
  address: string;
  role: 'sales' | 'manager' | 'viewer';
  isActive: boolean;
  logoUrl?: string;
}

/** 切换门店请求 */
export interface SwitchStoreRequest {
  store_id: string;
}

/** 切换门店响应 */
export interface SwitchStoreResponse {
  accessToken: string;
  refreshToken: string;
  storeId: string;
  storeName: string;
}
