/** 色卡品牌 */
export interface ColorBrand {
  id: string;
  name: string;
  description?: string;
  priority?: number;
}

/** 颜色色块 */
export interface ColorSwatchItem {
  id: string;
  brandId: string;
  name: string;
  hex: string;
  rgbR: number;
  rgbG: number;
  rgbB: number;
  pricePerM2?: number;
}

/** 材质 */
export interface Material {
  id: string;
  name: string;
  description?: string;
  priceMultiplier?: number;
  type: 'glossy' | 'matte' | 'satin' | string;
}
