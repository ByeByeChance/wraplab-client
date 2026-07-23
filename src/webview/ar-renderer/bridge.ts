/**
 * postMessage 通信封装
 * 负责 Taro <-> AR H5 之间的双向消息传递
 */
import type { ArMessage } from './types';
import { ArMessageType } from './types';

type MessageHandler = (payload: unknown) => void;

const handlers = new Map<ArMessageType, MessageHandler[]>();

/** 注册消息处理器 */
export function onMessage(type: ArMessageType, handler: MessageHandler): void {
  const existing = handlers.get(type) || [];
  existing.push(handler);
  handlers.set(type, existing);
}

/** 移除消息处理器 */
export function offMessage(type: ArMessageType, handler: MessageHandler): void {
  const existing = handlers.get(type) || [];
  handlers.set(
    type,
    existing.filter((h) => h !== handler),
  );
}

/** 向 Taro 发送消息 */
export function postToTaro<T>(type: ArMessageType, payload?: T): void {
  const message: ArMessage<T> = {
    type,
    payload,
    timestamp: Date.now(),
  };

  // 使用微信小程序 postMessage
  const globalWx = (window as unknown as Record<string, unknown>).wx as
    | { miniProgram?: { postMessage?: (msg: { data: ArMessage<T>[] }) => void } }
    | undefined;
  if (globalWx?.miniProgram?.postMessage) {
    globalWx.miniProgram.postMessage({ data: [message] });
  }

  // 通用 postMessage
  if (typeof window !== 'undefined' && window.parent) {
    window.parent.postMessage(JSON.stringify(message), '*');
  }
}

/** 接收来自 Taro 的消息 */
export function initMessageListener(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('message', (event) => {
    try {
      const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      if (!data || !data.type) return;

      // 处理消息数组 (微信小程序格式)
      const messages: ArMessage[] = Array.isArray(data) ? data : [data];

      for (const msg of messages) {
        const msgHandlers = handlers.get(msg.type as ArMessageType);
        if (msgHandlers) {
          msgHandlers.forEach((handler) => handler(msg.payload));
        }
      }
    } catch {
      // 忽略无法解析的消息
    }
  });
}
