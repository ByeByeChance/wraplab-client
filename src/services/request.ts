import Taro from '@tarojs/taro';
import { API_BASE_URL, API_PREFIX, REQUEST_TIMEOUT, MAX_TOKEN_REFRESH_RETRIES } from '../utils/constants';
import { useAuthStore } from '../stores/auth-store';
import type { ApiResponse, PaginatedData } from '../types';

/** Token 刷新锁 (防止并发刷新) */
let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

/** 请求配置扩展 */
interface RequestConfig extends Omit<Taro.request.Option, 'url'> {
  url: string;
  __tokenRefreshRetryCount?: number;
}

/** 自定义 API 错误类 */
export class ApiError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
    this.name = 'ApiError';
  }
}

/**
 * Token 自动刷新 (带并发锁)
 */
async function handleTokenRefresh(): Promise<void> {
  const authStore = useAuthStore.getState();

  // 已有刷新进行中，等待其结果
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      await authStore.refreshAccessToken();
    } catch {
      // 刷新失败 -> 跳转登录
      authStore.logout();
      throw new ApiError(401, '登录已过期，请重新登录');
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * 统一请求封装
 * - 自动注入 JWT Authorization Header
 * - 401 自动刷新 Token
 * - 统一错误处理
 * - 请求/响应类型安全
 */
export async function request<T>(
  config: RequestConfig,
): Promise<T> {
  const authStore = useAuthStore.getState();

  // 注入 Authorization header
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(config.header as Record<string, string>),
  };

  if (authStore.accessToken) {
    headers['Authorization'] = `Bearer ${authStore.accessToken}`;
  }

  try {
    const response = await Taro.request({
      ...config,
      url: `${API_BASE_URL}${API_PREFIX}${config.url}`,
      header: headers,
      timeout: config.timeout || REQUEST_TIMEOUT,
    });

    const { statusCode, data } = response;

    // 成功 (2xx)
    if (statusCode >= 200 && statusCode < 300) {
      const body = data as ApiResponse<T>;
      if (body.code === 0) {
        return body.data;
      }
      // 业务错误 (code !== 0)
      throw new ApiError(body.code, body.message);
    }

    // 401 -- Token 刷新
    if (statusCode === 401) {
      const retryCount = config.__tokenRefreshRetryCount || 0;
      if (retryCount >= MAX_TOKEN_REFRESH_RETRIES) {
        // 刷新后仍 401：强制登出
        authStore.logout();
        throw new ApiError(401, '登录已过期，请重新登录');
      }
      await handleTokenRefresh();
      // 刷新成功后重试原始请求
      return request<T>({ ...config, __tokenRefreshRetryCount: retryCount + 1 });
    }

    // 403 -- 无权限
    if (statusCode === 403) {
      Taro.showToast({ title: '无权限访问', icon: 'none' });
      throw new ApiError(403, '无权限访问');
    }

    // 500 -- 服务端错误
    if (statusCode >= 500) {
      Taro.showToast({ title: '服务器繁忙，请稍后重试', icon: 'none' });
      throw new ApiError(statusCode, '服务器繁忙，请稍后重试');
    }

    // 其他错误
    const body = data as ApiResponse<unknown>;
    throw new ApiError(body.code || statusCode, body.message || '请求失败');

  } catch (error) {
    // 网络超时/断网
    if (error instanceof Error && error.message.includes('timeout')) {
      Taro.showToast({ title: '网络连接超时，请重试', icon: 'none' });
      throw new ApiError(-1, '网络连接超时');
    }

    if (error instanceof Error && error.message.includes('network')) {
      Taro.showToast({ title: '当前无网络连接', icon: 'none' });
      throw new ApiError(-1, '当前无网络连接');
    }

    // ApiError 直接抛出
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(-1, '未知错误');
  }
}

/** 分页请求参数 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/** 带分页的 GET 请求 */
export async function getPaginated<T, P extends Record<string, unknown> = Record<string, unknown>>(
  url: string,
  params?: P,
): Promise<PaginatedData<T>> {
  const query = Object.entries(params || {})
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  const fullUrl = query ? `${url}?${query}` : url;
  return request<PaginatedData<T>>({ url: fullUrl, method: 'GET' });
}
