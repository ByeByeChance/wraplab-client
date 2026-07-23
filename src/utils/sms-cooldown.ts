import { useState, useEffect, useRef } from 'react';
import Taro, { useDidHide, useDidShow } from '@tarojs/taro';
import { SMS_COOLDOWN_MS } from './constants';

/** 冷却结束时间存储键 */
const COOLDOWN_STORAGE_PREFIX = 'wraplab_cooldown_';

/**
 * 通用冷却倒计时 Hook
 * @param cooldownMs 冷却时长 (毫秒), 默认 60000 (60s)
 * @param storageKey Storage 持久化 key (用于跨页面恢复), 不传则不持久化
 * @returns cooldownLeft 剩余秒数, startCooldown 启动冷却, isCooldown 是否冷却中
 */
export function useCooldown(cooldownMs: number = SMS_COOLDOWN_MS, storageKey?: string): {
  cooldownLeft: number;
  startCooldown: () => void;
  isCooldown: boolean;
} {
  const [cooldownLeft, setCooldownLeft] = useState<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endTimeRef = useRef<number>(0);

  const runTimer = (endTime: number): void => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const left = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setCooldownLeft(left);
      if (left === 0 && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }, 1000);
  };

  const startCooldown = (): void => {
    const endTime = Date.now() + cooldownMs;
    endTimeRef.current = endTime;
    if (storageKey) {
      Taro.setStorageSync(`${COOLDOWN_STORAGE_PREFIX}${storageKey}`, endTime);
    }
    runTimer(endTime);
  };

  // 组件挂载时从 storage 恢复
  useEffect(() => {
    if (storageKey) {
      const saved: number | null = Taro.getStorageSync(`${COOLDOWN_STORAGE_PREFIX}${storageKey}`);
      if (saved && saved > Date.now()) {
        endTimeRef.current = saved;
        runTimer(saved);
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [storageKey]);

  // 页面切后台不停止计时 (Storage 持久化了 endTime)
  // useDidShow 时恢复检查
  useDidShow(() => {
    if (storageKey) {
      const saved: number | null = Taro.getStorageSync(`${COOLDOWN_STORAGE_PREFIX}${storageKey}`);
      if (saved && saved > Date.now() && !timerRef.current) {
        runTimer(saved);
      }
    }
  });

  useDidHide(() => {
    // 不清除 storage，计时器继续在后台运行 (Storage 持久化 endTime)
    // 仅在无 storageKey 时暂停计时器
    if (!storageKey && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  });

  return {
    cooldownLeft,
    startCooldown,
    isCooldown: cooldownLeft > 0,
  };
}
