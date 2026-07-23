/** 店员信息 */
export interface StaffInfo {
  id: string;
  name: string;
  phone: string;
  storeId: string;
  storeName: string;
  avatar?: string;
}

/** 认证 Token */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** 登录响应 */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  staff: StaffInfo;
}

/** Token 刷新响应 */
export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}
