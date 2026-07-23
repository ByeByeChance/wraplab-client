import { create } from 'zustand';
import { getCareReminders } from '../services/customer-care.service';
import type { CareCustomer } from '../types';

interface CustomerCareState {
  /** 生日提醒列表 */
  birthdays: CareCustomer[];
  /** 纪念日提醒列表 */
  anniversaries: CareCustomer[];
  /** 加载状态 */
  loading: boolean;
  error: string | null;
  /** 未来 N 天范围 */
  lookaheadDays: number;

  // Actions
  fetchCareReminders: (days?: number) => Promise<void>;
  reset: () => void;
}

export const useCustomerCareStore = create<CustomerCareState>((set) => ({
  birthdays: [],
  anniversaries: [],
  loading: false,
  error: null,
  lookaheadDays: 30,

  fetchCareReminders: async (days?: number) => {
    set({ loading: true, error: null });
    try {
      const data = await getCareReminders({ days: days ?? 30 });
      set({
        birthdays: data.birthdays,
        anniversaries: data.anniversaries,
        loading: false,
      });
    } catch (err) {
      // 403 权限不足时静默隐藏
      const message = err instanceof Error ? err.message : '';
      // 权限不足时不设置 error (banner 不渲染即可)
      if (message.includes('403') || message.includes('无权限')) {
        set({ loading: false });
        return;
      }
      set({ loading: false, error: message || '客户关怀数据加载失败' });
    }
  },

  reset: () => {
    set({
      birthdays: [],
      anniversaries: [],
      loading: false,
      error: null,
      lookaheadDays: 30,
    });
  },
}));
