import { request } from './request';
import type { JoinWaitlistParams, WaitlistJoinResult, WaitlistEntry } from '../types';

/** 加入候补队列 */
export function joinWaitlist(data: JoinWaitlistParams): Promise<WaitlistJoinResult> {
  return request<WaitlistJoinResult>({
    url: '/appointments/waitlist',
    method: 'POST',
    data,
  });
}

/** 查询候补状态 */
export function getWaitlistStatus(params: { customer_phone: string; date?: string }): Promise<WaitlistEntry[]> {
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  return request<WaitlistEntry[]>({
    url: `/appointments/waitlist/status${query ? `?${query}` : ''}`,
    method: 'GET',
  });
}

/** 取消候补 */
export function cancelWaitlist(waitlistId: string): Promise<void> {
  return request<void>({
    url: `/appointments/waitlist/${encodeURIComponent(waitlistId)}`,
    method: 'DELETE',
  });
}
