import { request } from './request';
import type { Brand, Series, Model } from '../types';

/** 获取品牌列表 */
export function getBrands(): Promise<Brand[]> {
  return request<Brand[]>({
    url: '/vehicles/brands',
    method: 'GET',
  });
}

/** 获取车系列表 */
export function getSeries(brandId: string): Promise<Series[]> {
  return request<Series[]>({
    url: `/vehicles/series?brandId=${encodeURIComponent(brandId)}`,
    method: 'GET',
  });
}

/** 获取型号列表 */
export function getModels(seriesId: string): Promise<Model[]> {
  return request<Model[]>({
    url: `/vehicles/models?seriesId=${encodeURIComponent(seriesId)}`,
    method: 'GET',
  });
}
