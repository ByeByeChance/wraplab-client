import { request } from './request';
import type { CareReminder } from '../types';

/** 获取客户关怀提醒 (需 sales/manager 角色) */
export function getCareReminders(params?: { days?: number }): Promise<CareReminder> {
  return request<CareReminder>({
    url: `/admin/dashboard/customer-care?days=${params?.days ?? 30}`,
    method: 'GET',
  });
}
