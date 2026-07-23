/** 短信验证码类型 */
export type SmsCodeType = 'login' | 'appointment_verify';

/** 短信验证码状态 */
export type SmsCodeStatus = 'idle' | 'sending' | 'counting' | 'inputting' | 'verifying' | 'verified' | 'error';

/** 短信验证码发送请求 */
export interface SmsSendRequest {
  phone: string;
  type: SmsCodeType;
}

/** 短信验证码登录请求 */
export interface SmsLoginRequest {
  phone: string;
  sms_code: string;
}

/** 短信验证码登录响应 */
export interface SmsLoginResponse {
  access_token: string;
  refresh_token: string;
  staff: {
    id: string;
    name: string;
    phone: string;
    storeId: string;
    storeName: string;
    avatar?: string;
  };
  /** 首次验证码登录是否需要设置密码 */
  need_set_password?: boolean;
}

/** 短信验证码校验请求 */
export interface SmsVerifyRequest {
  phone: string;
  sms_code: string;
  type: SmsCodeType;
}

/** 短信验证码校验响应 */
export interface SmsVerifyResponse {
  verified: boolean;
}
