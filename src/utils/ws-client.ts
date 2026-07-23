import Taro from '@tarojs/taro';
import { useAuthStore } from '../stores/auth-store';
import { WS_URL } from './constants';
import type { TaroToH5Message, H5ToTaroMessage } from '../types';

/** WebSocket 连接状态 */
export type WsStatus = 'idle' | 'connecting' | 'connected' | 'disconnected';

/** WebSocket 客户端配置 */
export interface WsClientConfig {
  /** 重连基础延迟 (ms) */
  reconnectBaseDelay: number;
  /** 最大重连次数 (超过后降级为 postMessage) */
  maxReconnectAttempts: number;
  /** 心跳间隔 (ms) */
  heartbeatInterval: number;
  /** 心跳超时 (ms) -- 超时视为断开 */
  heartbeatTimeout: number;
}

const DEFAULT_CONFIG: WsClientConfig = {
  reconnectBaseDelay: 1000,
  maxReconnectAttempts: 3,
  heartbeatInterval: 30000,
  heartbeatTimeout: 10000,
};

const MAX_QUEUE_SIZE = 100;
const CONNECTION_TIMEOUT = 10000; // S-10: 10s connection timeout

/** 消息回调处理器类型 */
type MessageHandler = (msg: H5ToTaroMessage) => void;

/** WebSocket 客户端接口 */
export interface WsClient {
  /** 当前连接状态 */
  readonly status: WsStatus;
  /** 建立连接 */
  connect: (configId: string, modelId: string) => Promise<void>;
  /** 断开连接 */
  disconnect: () => void;
  /** 发送消息到 H5 (未连接时入队) */
  send: (msg: TaroToH5Message) => void;
  /** 注册 H5 消息回调 */
  onMessage: (handler: MessageHandler) => void;
  /** 移除消息回调 */
  offMessage: (handler: MessageHandler) => void;
  /** 注册降级回调 (连接失败超过重试次数时触发) */
  onDegrade: (handler: () => void) => void;
  /** 移除降级回调 */
  offDegrade: (handler: () => void) => void;
}

/** 创建 WebSocket 客户端 */
export function createWsClient(config?: Partial<WsClientConfig>): WsClient {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  let socket: Taro.SocketTask | null = null;
  let wsStatus: WsStatus = 'idle';
  let reconnectCount = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let heartbeatTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  let messageHandlers: MessageHandler[] = [];
  let degradeHandlers: Array<() => void> = [];
  let sendQueue: TaroToH5Message[] = [];

  /** 释放心跳定时器 */
  function stopHeartbeat(): void {
    if (heartbeatTimer !== null) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    if (heartbeatTimeoutTimer !== null) {
      clearTimeout(heartbeatTimeoutTimer);
      heartbeatTimeoutTimer = null;
    }
  }

  /** 重置心跳超时计时器 (收到消息时调用) */
  function resetHeartbeatTimeout(): void {
    if (heartbeatTimeoutTimer !== null) {
      clearTimeout(heartbeatTimeoutTimer);
      heartbeatTimeoutTimer = null;
    }
  }

  /** 启动心跳 */
  function startHeartbeat(): void {
    stopHeartbeat();
    heartbeatTimer = setInterval(() => {
      if (socket && wsStatus === 'connected') {
        socket.send({
          data: JSON.stringify({ type: 'PING', timestamp: Date.now() }),
        });

        // 等待 PONG 回复，超时判定断开重连
        heartbeatTimeoutTimer = setTimeout(() => {
          if (socket && wsStatus === 'connected') {
            socket.close({ code: 3001, reason: 'heartbeat timeout' });
          }
        }, cfg.heartbeatTimeout);
      }
    }, cfg.heartbeatInterval);
  }

  /** 刷新消息队列 (连接恢复后发送积压消息) */
  function flushQueue(): void {
    if (!socket || sendQueue.length === 0) return;
    const batch = sendQueue.splice(0, sendQueue.length);
    for (const msg of batch) {
      socket.send({ data: JSON.stringify(msg) });
    }
  }

  /** 触发降级通知 */
  function notifyDegrade(): void {
    for (const handler of degradeHandlers) {
      handler();
    }
  }

  /** 尝试自动重连 */
  function attemptReconnect(configId: string, modelId: string): void {
    if (reconnectCount >= cfg.maxReconnectAttempts) {
      // 超过最大重试次数，降级到 postMessage
      wsStatus = 'disconnected';
      notifyDegrade();
      return;
    }

    const delay = cfg.reconnectBaseDelay * Math.pow(2, reconnectCount);
    reconnectCount += 1;

    // B-2: 跟踪重连定时器，disconnect() 时清除
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (wsStatus === 'disconnected') {
        // B-4: doConnect 内部会清理旧 socket，此处仅触发重连
        void doConnect(configId, modelId).catch(() => {
          // 静默处理重连失败，attemptReconnect 已在 onError/onClose 中递归调用
        });
      }
    }, delay);
  }

  /** 执行 WebSocket 连接 */
  async function doConnect(configId: string, modelId: string): Promise<void> {
    // S-10: 检查 token 是否存在，无 token 时直接降级
    const token = useAuthStore.getState().accessToken;
    if (!token) {
      wsStatus = 'disconnected';
      notifyDegrade();
      return;
    }

    // B-4: 清理旧 socket 再创建新的
    if (socket) {
      try {
        socket.close({ code: 1000, reason: 'reconnect' });
      } catch {
        // 忽略关闭旧连接时的错误
      }
      socket = null;
    }

    const wsUrl = `${WS_URL}?token=${token}&configurationId=${encodeURIComponent(configId)}&modelId=${encodeURIComponent(modelId)}`;

    wsStatus = 'connecting';

    // B-1: 返回 Promise，在 onOpen 时 resolve
    return new Promise<void>((resolve, _reject) => {
      // B-3: 连接超时 (10s)
      const connectTimeout = setTimeout(() => {
        if (wsStatus === 'connecting' && socket) {
          try {
            socket.close({ code: 3002, reason: 'connection timeout' });
          } catch {
            // 忽略关闭错误
          }
          socket = null;
        }
        wsStatus = 'disconnected';
        attemptReconnect(configId, modelId);
      }, CONNECTION_TIMEOUT);

      Taro.connectSocket({
        url: wsUrl,
        header: {
          'content-type': 'application/json',
        },
      })
        .then((newSocket) => {
          socket = newSocket;

          if (!socket) {
            clearTimeout(connectTimeout);
            wsStatus = 'disconnected';
            attemptReconnect(configId, modelId);
            return;
          }

          socket.onOpen(() => {
            clearTimeout(connectTimeout);
            wsStatus = 'connected';
            reconnectCount = 0;
            startHeartbeat();
            flushQueue();
            resolve();
          });

          socket.onMessage((res) => {
            resetHeartbeatTimeout();

            try {
              const msg = JSON.parse(res.data as string) as H5ToTaroMessage;
              // 收到 PONG 不需要分发给业务层
              if (msg.type === 'PONG' as never) return;
              for (const handler of messageHandlers) {
                handler(msg);
              }
            } catch {
              // 忽略解析错误，非 JSON 消息丢弃
            }
          });

          socket.onClose((res) => {
            stopHeartbeat();
            // 非主动断开 (code !== 1000) 时尝试重连
            if (wsStatus === 'connected' && res.code !== 1000) {
              wsStatus = 'disconnected';
              attemptReconnect(configId, modelId);
            } else {
              wsStatus = 'disconnected';
            }
          });

          socket.onError(() => {
            stopHeartbeat();
            if (wsStatus === 'connecting') {
              wsStatus = 'disconnected';
              attemptReconnect(configId, modelId);
            }
          });
        })
        .catch(() => {
          clearTimeout(connectTimeout);
          wsStatus = 'disconnected';
          attemptReconnect(configId, modelId);
        });
    });
  }

  return {
    get status(): WsStatus {
      return wsStatus;
    },

    // B-1: await doConnect 确保连接完成再返回
    connect: async (configId: string, modelId: string): Promise<void> => {
      await doConnect(configId, modelId);
    },

    disconnect: (): void => {
      stopHeartbeat();

      // B-2: 取消待执行的重连定时器
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }

      if (socket) {
        socket.close({ code: 1000, reason: 'user disconnect' });
        socket = null;
      }
      wsStatus = 'disconnected';
      reconnectCount = 0;

      // S-9: 断开时清空发送队列
      sendQueue = [];
    },

    send: (msg: TaroToH5Message): void => {
      if (wsStatus === 'connected' && socket) {
        socket.send({ data: JSON.stringify(msg) });
      } else {
        // S-8: 队列上限保护，防止内存无限增长
        if (sendQueue.length >= MAX_QUEUE_SIZE) {
          sendQueue.shift();
        }
        sendQueue.push(msg);
      }
    },

    onMessage: (handler: MessageHandler): void => {
      messageHandlers.push(handler);
    },

    offMessage: (handler: MessageHandler): void => {
      messageHandlers = messageHandlers.filter((h) => h !== handler);
    },

    onDegrade: (handler: () => void): void => {
      degradeHandlers.push(handler);
    },

    offDegrade: (handler: () => void): void => {
      degradeHandlers = degradeHandlers.filter((h) => h !== handler);
    },
  };
}
