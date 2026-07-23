/** 候补条目 */
export interface WaitlistEntry {
  waitlistId: string;
  date: string;
  timeSlot: string;
  storeName: string;
  position: number;
  status: 'waiting' | 'promoted' | 'cancelled';
  customerName: string;
  customerPhone: string;
  vehicleInfo: string;
  createdAt: string;
  promotedAt?: string;
  appointmentId?: string;
}

/** 加入候补参数 (snake_case matching server DTO) */
export interface JoinWaitlistParams {
  store_id: string;
  appointment_date: string;
  time_slot_id: string;
  customer_name: string;
  customer_phone: string;
  vehicle_info: string;
  service_type: string;
  sms_code?: string;
}

/** 加入候补结果 */
export interface WaitlistJoinResult {
  waitlistId: string;
  position: number;
  queueLength: number;
  estimatedDays: number;
}

/** 时段候补状态 */
export interface WaitlistSlotStatus {
  isFull: boolean;
  queueLength: number;
  userInQueue: boolean;
  userPosition?: number;
}
