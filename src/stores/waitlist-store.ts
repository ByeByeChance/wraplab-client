import { create } from 'zustand';
import Taro from '@tarojs/taro';
import {
  joinWaitlist as apiJoinWaitlist,
  cancelWaitlist as apiCancelWaitlist,
  getWaitlistStatus as apiGetWaitlistStatus,
} from '../services/waitlist.service';
import type { WaitlistEntry, WaitlistJoinResult, WaitlistSlotStatus } from '../types';

/** 用户视角的候补参数 (camelCase, as used in appointment create page) */
export interface WaitlistUserParams {
  date: string;
  timeSlotId: string;
  storeId: string;
  customerName: string;
  customerPhone: string;
  vehicleInfo: string;
  serviceType: string;
  smsCode?: string;
}

interface WaitlistState {
  waitlist: WaitlistEntry[];
  submitting: boolean;
  submitError: string | null;
  loading: boolean;
  error: string | null;
  refreshing: boolean;

  /** Phase 5: 时段候补状态 */
  currentSlotStatus: WaitlistSlotStatus | null;
  slotStatusLoading: boolean;

  joinWaitlist: (params: WaitlistUserParams) => Promise<WaitlistJoinResult>;
  fetchMyWaitlist: (phone: string) => Promise<void>;
  leaveWaitlist: (waitlistId: string) => Promise<void>;
  refresh: (phone: string) => Promise<void>;
  reset: () => void;

  /** 查询时段候补状态 */
  fetchSlotStatus: (phone: string, date: string, timeSlotId: string) => Promise<void>;
}

export const useWaitlistStore = create<WaitlistState>((set) => ({
  waitlist: [],
  submitting: false,
  submitError: null,
  loading: false,
  error: null,
  refreshing: false,
  currentSlotStatus: null,
  slotStatusLoading: false,

  joinWaitlist: async (params: WaitlistUserParams) => {
    set({ submitting: true, submitError: null });
    try {
      // Map user-facing camelCase to server snake_case
      const result = await apiJoinWaitlist({
        store_id: params.storeId,
        appointment_date: params.date,
        time_slot_id: params.timeSlotId,
        customer_name: params.customerName,
        customer_phone: params.customerPhone,
        vehicle_info: params.vehicleInfo,
        service_type: params.serviceType,
        sms_code: params.smsCode,
      });
      set({ submitting: false });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : '候补提交失败';
      set({ submitting: false, submitError: message });
      throw err;
    }
  },

  fetchMyWaitlist: async (phone: string) => {
    set({ loading: true, error: null });
    try {
      const data = await apiGetWaitlistStatus({ customer_phone: phone });
      set({ waitlist: data, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : '候补列表加载失败';
      set({ loading: false, error: message });
    }
  },

  leaveWaitlist: async (waitlistId: string) => {
    try {
      await apiCancelWaitlist(waitlistId);
      set((state) => ({
        waitlist: state.waitlist.filter((w) => w.waitlistId !== waitlistId),
      }));
      Taro.showToast({ title: '已取消候补', icon: 'success' });
    } catch (err) {
      const message = err instanceof Error ? err.message : '取消失败';
      Taro.showToast({ title: message, icon: 'none' });
      throw err;
    }
  },

  refresh: async (phone: string) => {
    set({ refreshing: true });
    try {
      const data = await apiGetWaitlistStatus({ customer_phone: phone });
      set({ waitlist: data, refreshing: false });
    } catch {
      set({ refreshing: false });
    }
  },

  reset: () => {
    set({
      waitlist: [],
      submitting: false,
      submitError: null,
      loading: false,
      error: null,
      refreshing: false,
      currentSlotStatus: null,
      slotStatusLoading: false,
    });
  },

  fetchSlotStatus: async (phone: string, date: string, timeSlotId: string) => {
    set({ slotStatusLoading: true });
    try {
      const data = await apiGetWaitlistStatus({ customer_phone: phone, date });
      const entry = data.find((e) => e.date === date && e.timeSlot === timeSlotId);
      const status: WaitlistSlotStatus = {
        isFull: false,
        queueLength: data.length,
        userInQueue: Boolean(entry),
        userPosition: entry?.position,
      };
      set({ currentSlotStatus: status, slotStatusLoading: false });
    } catch {
      set({ slotStatusLoading: false, currentSlotStatus: null });
    }
  },
}));
