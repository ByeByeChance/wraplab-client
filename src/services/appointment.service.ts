import { request, getPaginated } from './request';
import type { PaginatedData } from '../types';
import type { ServiceType, TimeSlot, Appointment } from '../types/phase3';

interface CreateAppointmentParams {
  storeId: string;
  serviceType: string;
  appointmentDate: string;
  timeSlot: string;
  customerName: string;
  customerPhone: string;
  vehicleInfo?: string;
  remark?: string;
}

interface CancelAppointmentParams {
  reason: string;
}

interface SlotQueryParams {
  storeId: string;
  date: string;
}

/** 获取服务类型列表 */
export async function getServiceTypes(): Promise<ServiceType[]> {
  return request<ServiceType[]>({
    url: '/appointments/service-types',
    method: 'GET',
  });
}

/** 获取可用时段 */
export async function getAvailableSlots(
  params: SlotQueryParams,
): Promise<{
  storeId: string;
  date: string;
  slots: TimeSlot[];
}> {
  return request<{
    storeId: string;
    date: string;
    slots: TimeSlot[];
  }>({
    url: `/appointments/slots?store_id=${encodeURIComponent(params.storeId)}&date=${encodeURIComponent(params.date)}`,
    method: 'GET',
  });
}

/** 提交预约 */
export async function createAppointment(
  params: CreateAppointmentParams,
): Promise<Appointment> {
  return request<Appointment>({
    url: '/appointments',
    method: 'POST',
    data: params,
  });
}

/** 获取我的预约列表 */
export async function getMyAppointments(params?: {
  status?: string;
  page?: number;
  size?: number;
}): Promise<PaginatedData<Appointment>> {
  const queryParams: Record<string, unknown> = {};
  if (params?.status) queryParams.status = params.status;
  if (params?.page) queryParams.page = params.page;
  if (params?.size) queryParams.size = params.size;
  return getPaginated<Appointment>('/appointments/mine', queryParams);
}

/** 获取单个预约详情 */
export async function getAppointmentDetail(id: string): Promise<Appointment> {
  return request<Appointment>({
    url: `/appointments/${id}`,
    method: 'GET',
  });
}

/** 取消预约 */
export async function cancelAppointment(
  id: string,
  params: CancelAppointmentParams,
): Promise<void> {
  return request<void>({
    url: `/appointments/mine/${id}/cancel`,
    method: 'PUT',
    data: params,
  });
}

/** 发送预约验证码 */
export async function sendVerifySms(phone: string): Promise<void> {
  return request<void>({
    url: '/auth/sms/send',
    method: 'POST',
    data: { phone, type: 'appointment_verify' },
  });
}

/** 校验预约验证码 */
export async function verifySmsCode(
  phone: string,
  code: string,
): Promise<{ verified: boolean }> {
  return request<{ verified: boolean }>({
    url: '/auth/sms/verify',
    method: 'POST',
    data: { phone, sms_code: code, type: 'appointment_verify' },
  });
}
