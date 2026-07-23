import Taro from '@tarojs/taro';

/* eslint-disable no-console */

const STORAGE_PREFIX = 'wraplab_';

export const STORAGE_KEYS = {
  ACCESS_TOKEN: `${STORAGE_PREFIX}access_token`,
  REFRESH_TOKEN: `${STORAGE_PREFIX}refresh_token`,
  STAFF_INFO: `${STORAGE_PREFIX}staff_info`,
  REMEMBERED_PHONE: `${STORAGE_PREFIX}remembered_phone`,
  REMEMBERED_PASSWORD: `${STORAGE_PREFIX}remembered_password`,
} as const;

/** 设置存储 */
export async function setStorage<T>(key: string, value: T): Promise<void> {
  try {
    await Taro.setStorage({ key, data: JSON.stringify(value) });
  } catch (error) {
    console.error(`[Storage] setStorage failed for key: ${key}`, error);
  }
}

/** 获取存储 */
export async function getStorage<T>(key: string): Promise<T | null> {
  try {
    const res = await Taro.getStorage({ key });
    if (res.data) {
      return JSON.parse(res.data) as T;
    }
    return null;
  } catch {
    return null;
  }
}

/** 移除存储 */
export async function removeStorage(key: string): Promise<void> {
  try {
    await Taro.removeStorage({ key });
  } catch (error) {
    console.error(`[Storage] removeStorage failed for key: ${key}`, error);
  }
}

/** 同步获取存储 */
export function getStorageSync<T>(key: string): T | null {
  try {
    const res = Taro.getStorageSync(key);
    if (res) {
      return JSON.parse(res) as T;
    }
    return null;
  } catch {
    return null;
  }
}

/** 同步设置存储 */
export function setStorageSync<T>(key: string, value: T): void {
  try {
    Taro.setStorageSync(key, JSON.stringify(value));
  } catch (error) {
    console.error(`[Storage] setStorageSync failed for key: ${key}`, error);
  }
}
