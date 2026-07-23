import { request, getPaginated } from './request';
import type { ColorBrand, ColorSwatchItem, Material, PaginatedData } from '../types';

/** 获取色卡品牌列表 */
export function getColorBrands(): Promise<ColorBrand[]> {
  return request<ColorBrand[]>({
    url: '/colors/brands',
    method: 'GET',
  });
}

/** 获取指定品牌的颜色列表 (分页) */
export function getSwatches(
  brandId: string,
  params?: { page?: number; limit?: number },
): Promise<PaginatedData<ColorSwatchItem>> {
  return getPaginated<ColorSwatchItem>('/colors/swatches', {
    brandId,
    ...params,
  });
}

/** 获取材质列表 */
export function getMaterials(): Promise<Material[]> {
  return request<Material[]>({
    url: '/colors/materials',
    method: 'GET',
  });
}
