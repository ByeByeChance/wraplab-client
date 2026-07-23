/** 关怀客户信息 */
export interface CareCustomer {
  customerId: string;
  name: string;
  phone: string;
  /** 事件日期 (YYYY-MM-DD) */
  eventDate: string;
  /** 距离今天的天数 */
  daysUntil: number;
  /** 事件类型 */
  eventType: 'birthday' | 'anniversary';
  /** 纪念日标签 (仅 anniversary) */
  anniversaryLabel?: string;
}

/** 客户关怀提醒 */
export interface CareReminder {
  birthdays: CareCustomer[];
  anniversaries: CareCustomer[];
}

/** 客户列表项 */
export interface Customer {
  id: string;
  name: string;
  phone: string;
  /** 车型 */
  carModel?: string;
  /** 最近到店日期 */
  lastVisitDate?: string;
  /** 备注 */
  notes?: string;
}
