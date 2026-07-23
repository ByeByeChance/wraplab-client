/** Phase 3 门店相关类型 */

/** 附近门店 */
export interface NearbyStore {
  id: string;
  name: string;
  logo: string;
  coverImage: string;
  address: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  rating?: number;
  phone: string;
  businessHours: string;
  services: string[];
  photos: string[];
  tags: string[];
}

/** 门店详情 */
export interface StoreDetail extends NearbyStore {
  description: string;
  stats: { totalCases: number; totalAppointments: number };
}

/** 预约服务类型 */
export interface ServiceType {
  id: string;
  name: string;
  code: string;
  description?: string;
  icon?: string;
}

/** 预约时段 */
export interface TimeSlot {
  timeSlot: 'MORNING' | 'AFTERNOON' | 'EVENING';
  label: string;
  available: boolean;
  remaining: number;
}

/** 预约 */
export interface Appointment {
  id: string;
  appointmentNo: string;
  storeId: string;
  storeName: string;
  serviceType: string;
  appointmentDate: string;
  timeSlot: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  customerName: string;
  customerPhone: string;
  vehicleInfo?: string;
  remark?: string;
  cancelReason?: string;
  createdAt: string;
}

/** 材质详情 (Phase 3 扩展) */
export interface MaterialDetail {
  id: string;
  name: string;
  finishType: string;
  glossLevel: number;
  durability: string;
  durabilityScore: number;
  priceMultiplier: number;
  recommendedUse: string[];
  sampleImage: string;
  description?: string;
  pros?: string[];
  cons?: string[];
  relatedCaseIds?: string[];
  /** 厚度 */
  thickness?: string;
  /** 质保年限 */
  warrantyYears?: string;
  /** 施工难度 1-5 */
  installationDifficulty?: number;
}

/** 改色历史 */
export interface HistoryConfig {
  id: string;
  configurationId: string;
  modelId: string;
  modelInfo: string;
  brandName: string;
  seriesName: string;
  modelName: string;
  swatchName?: string;
  hex?: string;
  materialName?: string;
  mode: 'FULL' | 'PART';
  thumbnail?: string;
  createdAt: string;
}

/** 报价历史 */
export interface HistoryQuote {
  id: string;
  quoteNo: string;
  configurationId: string;
  modelInfo: string;
  colorInfo: { swatchName: string; hex: string; brandName: string };
  materialName: string;
  mode: 'FULL' | 'PART';
  totalPrice: number | null;
  customerName: string;
  customerPhone: string;
  status: 'submitted' | 'followed' | 'deal_closed' | 'expired';
  createdAt: string;
}

/** 报价详情 */
export interface QuoteDetail extends HistoryQuote {
  modelId: string;
  materialCost: number;
  laborCost: number;
  remark?: string;
  partDetails?: Array<{
    partCode: string;
    partName: string;
    hex: string;
    swatchName: string;
  }>;
}
