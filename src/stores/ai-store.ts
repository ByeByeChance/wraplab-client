import { create } from 'zustand';
import {
  getStyles as fetchStyleList,
  submitGeneration as apiSubmitGeneration,
  getGenerationStatus as apiGetGenerationStatus,
} from '../services/ai.service';
import type { AiStyle, GenerationTask, SubmitGenerationParams } from '../services/ai.service';

/** 重导出类型方便使用 */
export type { AiStyle, GenerationTask };

type AIStatus = 'idle' | 'pending' | 'processing' | 'completed' | 'failed';

interface AiState {
  /** AI 场景风格列表 */
  styles: AiStyle[];
  stylesLoading: boolean;
  stylesError: string | null;

  /** 当前生成任务 */
  currentTask: GenerationTask | null;
  /** 轮询定时器 ID */
  pollingTimer: ReturnType<typeof setInterval> | null;
  /** 超时定时器 ID (120s) */
  timeoutTimer: ReturnType<typeof setTimeout> | null;

  /** 获取所有可用场景风格 */
  fetchStyles: () => Promise<void>;
  /** 提交 AI 生图任务 */
  submitGeneration: (configId: string, params: SubmitGenerationParams) => Promise<string>;
  /** 开始轮询任务状态 (setInterval 每 2s) */
  startPolling: (generationId: string) => void;
  /** 停止轮询并清理定时器 */
  stopPolling: () => void;
  /** 重置任务状态并清理所有定时器 */
  resetTask: () => void;
}

const POLLING_INTERVAL = 2000; // 2s
const GENERATION_TIMEOUT = 120000; // 120s

export const useAiStore = create<AiState>((set, get) => ({
  styles: [],
  stylesLoading: false,
  stylesError: null,

  currentTask: null,
  pollingTimer: null,
  timeoutTimer: null,

  fetchStyles: async () => {
    set({ stylesLoading: true, stylesError: null });
    try {
      const styles = await fetchStyleList();
      set({ styles, stylesLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : '风格加载失败';
      set({ stylesLoading: false, stylesError: message });
    }
  },

  submitGeneration: async (configId: string, params: SubmitGenerationParams) => {
    const res = await apiSubmitGeneration(configId, params);
    return res.generationId;
  },

  startPolling: (generationId: string) => {
    // 清理已有轮询
    const { pollingTimer, timeoutTimer } = get();
    if (pollingTimer !== null) clearInterval(pollingTimer);
    if (timeoutTimer !== null) clearTimeout(timeoutTimer);

    // 发起首次查询
    void pollGeneration(generationId);

    // 启动定时轮询
    const pollTimer = setInterval(() => {
      void pollGeneration(generationId);
    }, POLLING_INTERVAL);

    // 超时定时器
    const toTimer = setTimeout(() => {
      const task = get().currentTask;
      if (task && (task.status === 'pending' || task.status === 'processing')) {
        set({
          currentTask: {
            ...task,
            status: 'failed' as AIStatus,
            errorMessage: '生成超时，请重试',
            completedAt: new Date().toISOString(),
          },
        });
        // 停止轮询
        const { pollingTimer: pt, timeoutTimer: tt } = get();
        if (pt !== null) clearInterval(pt);
        if (tt !== null) clearTimeout(tt);
        set({ pollingTimer: null, timeoutTimer: null });
      }
    }, GENERATION_TIMEOUT);

    set({ pollingTimer: pollTimer, timeoutTimer: toTimer });
  },

  stopPolling: () => {
    const { pollingTimer, timeoutTimer } = get();
    if (pollingTimer !== null) {
      clearInterval(pollingTimer);
      set({ pollingTimer: null });
    }
    if (timeoutTimer !== null) {
      clearTimeout(timeoutTimer);
      set({ timeoutTimer: null });
    }
  },

  resetTask: () => {
    const { pollingTimer, timeoutTimer } = get();
    if (pollingTimer !== null) clearInterval(pollingTimer);
    if (timeoutTimer !== null) clearTimeout(timeoutTimer);
    set({
      currentTask: null,
      pollingTimer: null,
      timeoutTimer: null,
    });
  },
}));

/**
 * 内部轮询函数: 查询任务状态并决定是否继续
 *
 * B-7 / S-4: 修复竞态条件 — await 之后重新读取 store 状态，
 * 确保使用的 timer 引用是最新的，且仅在 generationId 匹配时才清理。
 */
async function pollGeneration(generationId: string): Promise<void> {
  try {
    const task = await apiGetGenerationStatus(generationId);

    useAiStore.setState({ currentTask: task });

    // 终态停止轮询
    if (task.status === 'completed' || task.status === 'failed') {
      // B-7: await 后重新读取 store，确保 timer 引用不是过时的
      const state = useAiStore.getState();

      // B-7 / S-4: 仅在 generationId 匹配当前任务时清理定时器
      if (state.currentTask?.id === generationId) {
        if (state.pollingTimer !== null) {
          clearInterval(state.pollingTimer);
        }
        if (state.timeoutTimer !== null) {
          clearTimeout(state.timeoutTimer);
        }
        useAiStore.setState({ pollingTimer: null, timeoutTimer: null });
      }
    }
  } catch {
    // 单次轮询失败不中断，等待下次间隔重试
  }
}
