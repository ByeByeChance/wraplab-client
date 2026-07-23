/** 品牌 */
export interface Brand {
  id: string;
  name: string;
  logo: string;
  sortOrder: number;
}

/** 车系 */
export interface Series {
  id: string;
  brandId: string;
  name: string;
  yearStart: number;
  yearEnd: number;
  bodyTypes?: string[];
}

/** 型号 */
export interface Model {
  id: string;
  seriesId: string;
  name: string;
  year: number;
  bodyType: string;
  model3dUrl: string | null;
}
