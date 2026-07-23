/**
 * 防抖函数
 * @param fn 目标函数
 * @param delay 延迟时间 (ms), 默认 300ms
 * @returns 包装后的防抖函数
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay = 300,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}
