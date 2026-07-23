import { request } from './request';

/** 模型部件 */
export interface ModelPart {
  partCode: string;
  partName: string;
  category: string;
}

/** 获取车型部件列表 (GET /api/v1/vehicles/models/:id/parts) */
export function getModelParts(modelId: string): Promise<{ parts: ModelPart[] }> {
  return request<{ parts: ModelPart[] }>({
    url: `/vehicles/models/${encodeURIComponent(modelId)}/parts`,
    method: 'GET',
  });
}
