import { request } from './request';
import type { LoginResponse, RefreshResponse, SmsLoginResponse } from '../types';

interface LoginRequest {
  phone: string;
  password: string;
}

interface RefreshRequest {
  refreshToken: string;
}

interface SmsLoginRequest {
  phone: string;
  sms_code: string;
}

/** 手机号+密码登录 */
export function login(data: LoginRequest): Promise<LoginResponse> {
  return request<LoginResponse>({
    url: '/auth/login',
    method: 'POST',
    data,
  });
}

/** 短信验证码登录 */
export function smsLogin(data: SmsLoginRequest): Promise<SmsLoginResponse> {
  return request<SmsLoginResponse>({
    url: '/auth/sms-login',
    method: 'POST',
    data,
  });
}

/** 刷新 Token */
export function refreshToken(data: RefreshRequest): Promise<RefreshResponse> {
  return request<RefreshResponse>({
    url: '/auth/refresh',
    method: 'POST',
    data,
  });
}
