import { request } from './request';
import type { SmsLoginResponse, SmsVerifyResponse } from '../types';

/** 发送短信验证码 */
export function sendCode(params: { phone: string; type: 'login' | 'appointment_verify' }): Promise<void> {
  return request<void>({
    url: '/auth/sms/send',
    method: 'POST',
    data: params,
  });
}

/** 验证码登录 */
export function smsLogin(params: { phone: string; sms_code: string }): Promise<SmsLoginResponse> {
  return request<SmsLoginResponse>({
    url: '/auth/sms-login',
    method: 'POST',
    data: params,
  });
}

/** 校验验证码 (预约场景) */
export function verifyCode(params: {
  phone: string;
  sms_code: string;
  type: string;
}): Promise<SmsVerifyResponse> {
  return request<SmsVerifyResponse>({
    url: '/auth/sms/verify',
    method: 'POST',
    data: params,
  });
}
