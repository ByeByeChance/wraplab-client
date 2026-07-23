/** 通用 API 响应结构 */
export interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}

/** 分页 API 响应结构 */
export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
