/** 改色方案 */
export interface Configuration {
  id: string;
  storeId: string;
  modelId: string;
  modelName: string;
  brandName: string;
  seriesName: string;
  swatchName?: string;
  hex?: string;
  materialName?: string;
  thumbnail?: string;
  status: string;
  createdAt: string;
}

/** 热门方案 */
export interface HotScheme {
  id: string;
  modelId: string;
  configurationId?: string;
  modelName: string;
  brandName: string;
  seriesName: string;
  swatchName?: string;
  hex?: string;
  swatches?: { hex: string; name: string }[];
  thumbnail?: string;
}
