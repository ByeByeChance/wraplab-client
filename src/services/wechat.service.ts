import Taro from '@tarojs/taro';

import { request } from './request';
import type { LoginResponse } from '../types';

/** 微信登录响应 (与服务端约定) */
interface WechatLoginResponse {
  code: string;
}

/**
 * 微信静默登录
 * 获取微信 code 后调用服务端接口完成登录
 */
export async function wechatLogin(): Promise<LoginResponse> {
  const loginRes = await Taro.login();
  if (!loginRes.code) {
    throw new Error('获取微信登录凭证失败');
  }

  return request<LoginResponse>({
    url: '/auth/wechat-login',
    method: 'POST',
    data: { code: loginRes.code } as WechatLoginResponse,
  });
}

/**
 * 绑定微信 (密码登录成功后调用)
 * 将当前账号与微信 openid 绑定
 */
export async function wechatBind(): Promise<void> {
  const loginRes = await Taro.login();
  if (!loginRes.code) {
    throw new Error('获取微信登录凭证失败');
  }

  return request<void>({
    url: '/auth/wechat-bind',
    method: 'POST',
    data: { code: loginRes.code } as WechatLoginResponse,
  });
}
