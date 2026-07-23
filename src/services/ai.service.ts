import { request } from './request';

/** AI 场景风格 */
export interface AiStyle {
  id: string;
  name: string;
  category: 'studio' | 'outdoor' | 'street';
  thumbnail: string;
  description: string;
}

/** AI 生成任务 */
export interface GenerationTask {
  id: string;
  status: 'idle' | 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  resultImageUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

/** 提交生成参数 */
export interface SubmitGenerationParams {
  styleId: string;
  customPrompt?: string;
  configParts?: Array<{ partCode: string; hex: string }>;
}

/** 队列状态响应 */
export interface QueueStatusResponse {
  status: 'queued' | 'processing' | 'completed' | 'failed';
  queue_position: number;
  progress: number;
  estimated_wait_seconds: number;
  error_message?: string;
  result_image_url?: string;
}

/** 获取 AI 场景风格列表 (GET /api/v1/generations/styles) */
export function getStyles(): Promise<AiStyle[]> {
  return request<AiStyle[]>({
    url: '/generations/styles',
    method: 'GET',
  });
}

/** 提交 AI 生图任务 (POST /api/v1/configurations/:id/generate-image) */
export function submitGeneration(
  configId: string,
  params: SubmitGenerationParams,
): Promise<{ generationId: string }> {
  return request<{ generationId: string }>({
    url: `/configurations/${encodeURIComponent(configId)}/generate-image`,
    method: 'POST',
    data: params,
  });
}

/** 查询生成任务状态 (GET /api/v1/generations/:id) */
export function getGenerationStatus(generationId: string): Promise<GenerationTask> {
  return request<GenerationTask>({
    url: `/generations/${encodeURIComponent(generationId)}`,
    method: 'GET',
  });
}

/** 查询队列状态 (GET /api/v1/generations/:id/queue-status) */
export function getQueueStatus(generationId: string): Promise<QueueStatusResponse> {
  return request<QueueStatusResponse>({
    url: `/generations/${encodeURIComponent(generationId)}/queue-status`,
    method: 'GET',
  });
}
