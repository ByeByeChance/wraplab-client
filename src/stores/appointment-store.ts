import { create } from 'zustand';
import Taro from '@tarojs/taro';
import { appointmentService } from '../services';
import type { ServiceType, TimeSlot, Appointment } from '../types/phase3';

const SERVICE_TYPES_CACHE_TTL = 60 * 60 * 1000; // 1 hour
const DRAFT_TTL = 30 * 60 * 1000; // 30 minutes

interface AppointmentState {
  // 创建预约 -- 步骤数据
  selectedStoreId: string | null;
  selectedServiceType: string | null;
  selectedDate: string | null;
  selectedTimeSlot: string | null;

  // 服务类型列表
  serviceTypes: ServiceType[];
  serviceTypesLoading: boolean;
  serviceTypesError: string | null;
  serviceTypesLastFetchAt: number | null;

  // 可用时段
  timeSlots: TimeSlot[];
  timeSlotsLoading: boolean;
  timeSlotsError: string | null;

  // 提交预约
  submitting: boolean;
  submitError: string | null;

  // 我的预约列表
  appointments: Appointment[];
  appointmentsLoading: boolean;
  appointmentsError: string | null;
  appointmentStatusFilter: string;
  appointmentsPage: number;
  appointmentsHasMore: boolean;
  appointmentsRefreshing: boolean;
  /** 各 tab 的数量 (key: status filter, '' = 全部) */
  tabCounts: Record<string, number>;

  // 当前查看的预约详情
  currentAppointmentDetail: Appointment | null;
  currentAppointmentLoading: boolean;
  currentAppointmentError: string | null;

  // 取消预约状态
  cancelling: boolean;
  cancelError: string | null;

  // 创建成功后暂存
  lastCreatedAppointment: Appointment | null;

  // 草稿时间戳
  lastUpdatedAt: number | null;

  // Actions
  setStepData: (
    data: Partial<{
      selectedStoreId: string;
      selectedServiceType: string;
      selectedDate: string;
      selectedTimeSlot: string;
    }>,
  ) => void;
  fetchServiceTypes: () => Promise<void>;
  fetchTimeSlots: (storeId: string, date: string) => Promise<void>;
  submitAppointment: (data: {
    storeId: string;
    serviceType: string;
    appointmentDate: string;
    timeSlot: string;
    customerName: string;
    customerPhone: string;
    vehicleInfo?: string;
    remark?: string;
  }) => Promise<Appointment>;
  fetchMyAppointments: (params?: {
    status?: string;
    page?: number;
    size?: number;
  }) => Promise<void>;
  fetchAppointmentDetail: (id: string) => Promise<void>;
  cancelAppointment: (id: string, reason: string) => Promise<void>;
  resetCreateState: () => void;
  setStatusFilter: (status: string) => void;
  isDraftExpired: () => boolean;
  refreshMyAppointments: () => Promise<void>;
  loadMoreAppointments: () => Promise<void>;
}

export const useAppointmentStore = create<AppointmentState>((set, get) => ({
  selectedStoreId: null,
  selectedServiceType: null,
  selectedDate: null,
  selectedTimeSlot: null,

  serviceTypes: [],
  serviceTypesLoading: false,
  serviceTypesError: null,
  serviceTypesLastFetchAt: null,

  timeSlots: [],
  timeSlotsLoading: false,
  timeSlotsError: null,

  submitting: false,
  submitError: null,

  appointments: [],
  appointmentsLoading: false,
  appointmentsError: null,
  appointmentStatusFilter: '',
  appointmentsPage: 1,
  appointmentsHasMore: false,
  appointmentsRefreshing: false,
  tabCounts: {},

  currentAppointmentDetail: null,
  currentAppointmentLoading: false,
  currentAppointmentError: null,

  cancelling: false,
  cancelError: null,

  lastCreatedAppointment: null,

  lastUpdatedAt: null,

  setStepData: (data) => {
    set({ ...data, lastUpdatedAt: Date.now() });
  },

  fetchServiceTypes: async () => {
    const { serviceTypes, serviceTypesLastFetchAt } = get();
    if (
      serviceTypes.length > 0 &&
      serviceTypesLastFetchAt &&
      Date.now() - serviceTypesLastFetchAt < SERVICE_TYPES_CACHE_TTL
    ) {
      return;
    }
    set({ serviceTypesLoading: true, serviceTypesError: null });
    try {
      const data = await appointmentService.getServiceTypes();
      set({
        serviceTypes: data,
        serviceTypesLoading: false,
        serviceTypesError: null,
        serviceTypesLastFetchAt: Date.now(),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '服务类型加载失败';
      set({ serviceTypesLoading: false, serviceTypesError: message });
    }
  },

  fetchTimeSlots: async (storeId: string, date: string) => {
    set({ timeSlotsLoading: true, timeSlotsError: null, timeSlots: [] });
    try {
      const data = await appointmentService.getAvailableSlots({
        storeId,
        date,
      });
      set({
        timeSlots: data.slots,
        timeSlotsLoading: false,
        timeSlotsError: null,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '时段加载失败';
      set({ timeSlotsLoading: false, timeSlotsError: message });
    }
  },

  submitAppointment: async (data) => {
    const state = get();
    if (state.submitting) {
      throw new Error('预约正在提交中，请勿重复操作');
    }
    set({ submitting: true, submitError: null });
    try {
      const appointment = await appointmentService.createAppointment(data);
      set({
        submitting: false,
        submitError: null,
        lastCreatedAppointment: appointment,
        lastUpdatedAt: Date.now(),
      });
      return appointment;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '预约提交失败';
      set({ submitting: false, submitError: message });
      throw error;
    }
  },

  fetchMyAppointments: async (params) => {
    const { appointments } = get();
    const isFirstPage = !params?.page || params.page === 1;
    if (isFirstPage && appointments.length === 0) {
      set({ appointmentsLoading: true, appointmentsError: null });
    }
    try {
      const data = await appointmentService.getMyAppointments({
        status: (params?.status ?? get().appointmentStatusFilter) || undefined,
        page: params?.page ?? get().appointmentsPage,
        size: params?.size ?? 20,
      });
      const updated = isFirstPage
        ? data.items
        : [...get().appointments, ...data.items];
      const filterKey = params?.status ?? get().appointmentStatusFilter ?? '';
      set({
        appointments: updated,
        appointmentsLoading: false,
        appointmentsError: null,
        appointmentsPage: data.page,
        appointmentsHasMore: updated.length < data.total,
        tabCounts: {
          ...get().tabCounts,
          [filterKey]: data.total,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '预约列表加载失败';
      set({ appointmentsLoading: false, appointmentsError: message });
    }
  },

  fetchAppointmentDetail: async (id: string) => {
    set({ currentAppointmentLoading: true, currentAppointmentError: null });
    try {
      const data = await appointmentService.getAppointmentDetail(id);
      set({
        currentAppointmentDetail: data,
        currentAppointmentLoading: false,
        currentAppointmentError: null,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '预约详情加载失败';
      set({
        currentAppointmentLoading: false,
        currentAppointmentError: message,
      });
    }
  },

  cancelAppointment: async (id: string, reason: string) => {
    set({ cancelling: true, cancelError: null });
    try {
      await appointmentService.cancelAppointment(id, { reason });
      // Optimistically update the appointment in the list
      const appointments = get().appointments.map((a) =>
        a.id === id ? { ...a, status: 'cancelled' as const, cancelReason: reason } : a,
      );
      set({ appointments, cancelling: false, cancelError: null });
      Taro.showToast({ title: '预约已取消', icon: 'success' });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '取消失败';
      set({ cancelling: false, cancelError: message });
      throw error;
    }
  },

  resetCreateState: () => {
    set({
      selectedStoreId: null,
      selectedServiceType: null,
      selectedDate: null,
      selectedTimeSlot: null,
      timeSlots: [],
      timeSlotsLoading: false,
      timeSlotsError: null,
      submitError: null,
      lastUpdatedAt: null,
    });
  },

  setStatusFilter: (status: string) => {
    set({
      appointmentStatusFilter: status,
      appointmentsPage: 1,
      appointments: [],
    });
    get().fetchMyAppointments({ status: status || undefined, page: 1 });
  },

  isDraftExpired: (): boolean => {
    const { lastUpdatedAt } = get();
    if (!lastUpdatedAt) return false;
    return Date.now() - lastUpdatedAt > DRAFT_TTL;
  },

  refreshMyAppointments: async () => {
    set({
      appointmentsRefreshing: true,
      appointmentsError: null,
      appointmentsPage: 1,
    });
    try {
      const data = await appointmentService.getMyAppointments({
        status: get().appointmentStatusFilter || undefined,
        page: 1,
        size: 20,
      });
      const filterKey = get().appointmentStatusFilter || '';
      set({
        appointments: data.items,
        appointmentsRefreshing: false,
        appointmentsPage: data.page,
        appointmentsHasMore: data.items.length < data.total,
        tabCounts: {
          ...get().tabCounts,
          [filterKey]: data.total,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '刷新失败';
      set({ appointmentsRefreshing: false, appointmentsError: message });
    }
  },

  loadMoreAppointments: async () => {
    const { appointmentsHasMore, appointmentsLoading } = get();
    if (!appointmentsHasMore || appointmentsLoading) return;
    const nextPage = get().appointmentsPage + 1;
    await get().fetchMyAppointments({ page: nextPage });
  },
}));
