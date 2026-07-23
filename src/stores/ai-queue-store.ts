import { create } from 'zustand';
import {
  submitGeneration as apiSubmitGeneration,
  getQueueStatus as apiGetQueueStatus,
} from '../services/ai.service';
import { AI_QUEUE_POLL_INTERVAL_QUEUED, AI_QUEUE_POLL_INTERVAL_PROCESSING, AI_GENERATION_TIMEOUT } from '../utils/constants';
import type { SubmitGenerationParams } from '../services/ai.service';

type QueueStatus = 'idle' | 'queued' | 'processing' | 'completed' | 'failed';

interface AiQueueState {
  /** 当前生成任务 ID */
  generationId: string | null;
  /** 队列状态 */
  queueStatus: QueueStatus;
  /** 队列位置 (前方任务数) */
  queuePosition: number;
  /** 处理进度 (0-100) */
  progress: number;
  /** 预估等待秒数 */
  estimatedWaitSeconds: number;
  /** 失败原因 */
  errorMessage: string | null;
  /** 队列是否已满 */
  isQueueFull: boolean;
  /** 生成结果图 URL (completed 时) */
  resultImageUrl: string | null;

  // Actions
  submitGeneration: (configId: string, params: SubmitGenerationParams) => Promise<string>;
  startPolling: (generationId: string) => () => void;
  fetchQueueStatus: (generationId: string) => Promise<void>;
  reset: () => void;
  stopPolling: () => void;
}

export const useAiQueueStore = create<AiQueueState>((set, get) => {
  let timerId: ReturnType<typeof setInterval> | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const clearTimers = (): void => {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return {
    generationId: null,
    queueStatus: 'idle',
    queuePosition: 0,
    progress: 0,
    estimatedWaitSeconds: 0,
    errorMessage: null,
    isQueueFull: false,
    resultImageUrl: null,

    submitGeneration: async (configId: string, params: SubmitGenerationParams): Promise<string> => {
      const res = await apiSubmitGeneration(configId, params);
      return res.generationId;
    },

    startPolling: (generationId: string): (() => void) => {
      clearTimers();
      set({ generationId, queueStatus: 'queued' });

      const poll = async (): Promise<void> => {
        const state = get();
        if (state.queueStatus === 'completed' || state.queueStatus === 'failed') {
          clearTimers();
          return;
        }
        try {
          await get().fetchQueueStatus(generationId);
          // 根据新状态调整轮询间隔
          const newState = get();
          if (newState.queueStatus === 'completed' || newState.queueStatus === 'failed') {
            clearTimers();
            return;
          }
          if (newState.queueStatus === 'processing') {
            // 切换到更快轮询
            if (timerId !== null) clearInterval(timerId);
            timerId = setInterval(() => {
              void poll();
            }, AI_QUEUE_POLL_INTERVAL_PROCESSING);
          }
        } catch {
          // 轮询失败不中断
        }
      };

      // 立即执行一次
      void poll();
      timerId = setInterval(() => {
        void poll();
      }, AI_QUEUE_POLL_INTERVAL_QUEUED);

      // 超时定时器
      timeoutId = setTimeout(() => {
        const currentState = get();
        if (
          currentState.queueStatus === 'queued' ||
          currentState.queueStatus === 'processing'
        ) {
          set({
            queueStatus: 'failed',
            errorMessage: '生成超时，请重试',
          });
          clearTimers();
        }
      }, AI_GENERATION_TIMEOUT);

      // 返回停止函数
      return (): void => {
        clearTimers();
      };
    },

    fetchQueueStatus: async (generationId: string): Promise<void> => {
      try {
        const res = await apiGetQueueStatus(generationId);
        set({
          queueStatus: res.status,
          queuePosition: res.queue_position,
          progress: res.progress,
          estimatedWaitSeconds: res.estimated_wait_seconds,
          errorMessage: res.error_message ?? null,
          resultImageUrl: res.result_image_url ?? null,
        });
      } catch {
        // 单次查询失败不中断轮询
      }
    },

    reset: (): void => {
      clearTimers();
      set({
        generationId: null,
        queueStatus: 'idle',
        queuePosition: 0,
        progress: 0,
        estimatedWaitSeconds: 0,
        errorMessage: null,
        isQueueFull: false,
        resultImageUrl: null,
      });
    },

    stopPolling: (): void => {
      clearTimers();
    },
  };
});
