import { request, getPaginated } from './request';
import type { PaginatedData } from '../types';
import type { HistoryConfig, HistoryQuote, QuoteDetail } from '../types/phase3';

interface HistoryQueryParams {
  page?: number;
  size?: number;
  startDate?: string;
  endDate?: string;
}

/** 获取改色方案历史 (分页) */
export async function getConfigHistory(
  params?: HistoryQueryParams,
): Promise<PaginatedData<HistoryConfig>> {
  const queryParams: Record<string, unknown> = {};
  if (params?.page) queryParams.page = params.page;
  if (params?.size) queryParams.size = params.size;
  if (params?.startDate) queryParams.startDate = params.startDate;
  if (params?.endDate) queryParams.endDate = params.endDate;
  return getPaginated<HistoryConfig>('/configurations', queryParams);
}

/** 获取报价历史 (分页) */
export async function getQuoteHistory(
  params?: HistoryQueryParams,
): Promise<PaginatedData<HistoryQuote>> {
  const queryParams: Record<string, unknown> = {};
  if (params?.page) queryParams.page = params.page;
  if (params?.size) queryParams.size = params.size;
  if (params?.startDate) queryParams.startDate = params.startDate;
  if (params?.endDate) queryParams.endDate = params.endDate;
  return getPaginated<HistoryQuote>('/quotes', queryParams);
}

/** 获取报价详情 */
export async function getQuoteDetail(quoteId: string): Promise<QuoteDetail> {
  return request<QuoteDetail>({
    url: `/quotes/${quoteId}`,
    method: 'GET',
  });
}

/** 更新报价跟进状态 (P2) */
export async function updateQuoteStatus(
  quoteId: string,
  status: string,
): Promise<void> {
  return request<void>({
    url: `/quotes/${quoteId}/status`,
    method: 'PUT',
    data: { status },
  });
}
