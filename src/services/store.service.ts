import { request, getPaginated } from './request';
import type { PaginatedData, StoreInfo, SwitchStoreResponse } from '../types';
import type { NearbyStore, StoreDetail } from '../types/phase3';

interface NearbyStoreParams {
  lat: number;
  lng: number;
  radius?: number;
  page?: number;
  size?: number;
}

/** 获取附近门店列表 */
export async function getNearbyStores(
  params: NearbyStoreParams,
): Promise<PaginatedData<NearbyStore>> {
  return getPaginated<NearbyStore>('/stores/nearby', {
    lat: params.lat,
    lng: params.lng,
    radius: params.radius ?? 5000,
    page: params.page ?? 1,
    size: params.size ?? 20,
  });
}

/** 获取门店详情 */
export async function getStoreDetail(storeId: string): Promise<StoreDetail> {
  return request<StoreDetail>({
    url: `/stores/${storeId}`,
    method: 'GET',
  });
}

/** Phase 5: 获取店员关联的所有门店 */
export async function getMyStores(): Promise<StoreInfo[]> {
  return request<StoreInfo[]>({
    url: '/staff/me/stores',
    method: 'GET',
  });
}

/** Phase 5: 切换活跃门店 */
export async function switchStore(storeId: string): Promise<SwitchStoreResponse> {
  return request<SwitchStoreResponse>({
    url: '/stores/switch',
    method: 'POST',
    data: { store_id: storeId },
  });
}
