import { request } from './request';
import type { Quote } from '../types';

/** 生成报价请求 */
interface CreateQuoteRequest {
  configurationId: string;
  customerName: string;
  customerPhone: string;
  remark?: string;
}

/** 生成报价单 */
export function createQuote(data: CreateQuoteRequest): Promise<Quote> {
  return request<Quote>({
    url: '/quotes',
    method: 'POST',
    data,
  });
}
