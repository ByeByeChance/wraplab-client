import Taro from '@tarojs/taro';
import { createWsClient } from '../utils/ws-client';
import type { WsClient } from '../utils/ws-client';
import type { TaroToH5Message, H5ToTaroMessage } from '../types';

// --------------------- Interface ---------------------

/** 平台适配桥接接口 */
export interface PlatformBridge {
  /** 平台标识 */
  readonly platform: string;
  /** 当前传输方式 */
  readonly transport: 'websocket' | 'postMessage';
  /** 建立 WebView 通信连接 */
  connect(configId: string, modelId: string): Promise<void>;
  /** 断开连接 */
  disconnect(): void;
  /** 发送消息到 H5 */
  sendMessage(msg: TaroToH5Message): void;
  /** 注册 H5 消息回调 */
  onMessage(handler: (msg: H5ToTaroMessage) => void): void;
  /** 移除回调 */
  offMessage(handler: (msg: H5ToTaroMessage) => void): void;
  /** 连接是否活跃 */
  isConnected(): boolean;
}

// --------------------- WeChat Adapter ---------------------

/** 创建微信平台桥接适配器 */
export function createWechatBridge(): PlatformBridge {
  let wsClient: WsClient | null = null;
  let transportMode: 'websocket' | 'postMessage' = 'websocket';
  let messageHandlers: Array<(msg: H5ToTaroMessage) => void> = [];

  const bridge: PlatformBridge = {
    platform: 'wechat',

    get transport(): 'websocket' | 'postMessage' {
      return transportMode;
    },

    async connect(configId: string, modelId: string): Promise<void> {
      try {
        wsClient = createWsClient();

        // 注册降级回调
        wsClient.onDegrade(() => {
          transportMode = 'postMessage';
          Taro.showToast({ title: '已切换至备用连接', icon: 'none' });
        });

        // 注册消息回调
        wsClient.onMessage((msg: H5ToTaroMessage) => {
          for (const handler of messageHandlers) {
            handler(msg);
          }
        });

        await wsClient.connect(configId, modelId);
        transportMode = 'websocket';
      } catch {
        // WebSocket 失败 -> 降级为 postMessage
        transportMode = 'postMessage';
        Taro.showToast({ title: '已切换至备用连接', icon: 'none' });
      }
    },

    // B-6: 断开连接时清理 messageHandlers
    disconnect(): void {
      if (wsClient) {
        wsClient.disconnect();
        wsClient = null;
      }
      transportMode = 'websocket';
      messageHandlers = [];
    },

    sendMessage(msg: TaroToH5Message): void {
      if (transportMode === 'websocket' && wsClient && wsClient.status === 'connected') {
        wsClient.send(msg);
      } else {
        // postMessage fallback
        sendViaPostMessage(msg);
      }
    },

    onMessage(handler: (msg: H5ToTaroMessage) => void): void {
      messageHandlers.push(handler);
    },

    offMessage(handler: (msg: H5ToTaroMessage) => void): void {
      messageHandlers = messageHandlers.filter((h) => h !== handler);
    },

    // B-5: postMessage 模式也是活跃传输，应返回 true
    isConnected(): boolean {
      if (transportMode === 'websocket') {
        return wsClient ? wsClient.status === 'connected' : false;
      }
      // postMessage 降级模式仍然是活跃连接
      return true;
    },
  };

  return bridge;
}

/**
 * postMessage 降级发送 (微信平台)
 *
 * NOTE: 此处使用 Taro 内部 $scope API 访问小程序组件实例。
 * Taro 文档未公开此 API，但微信小程序 WebView 通信必须通过组件实例的 postMessage。
 * 如果 Taro 版本升级导致 $scope 不可用，需改用 Taro 官方 web-view 组件事件通信。
 */
function sendViaPostMessage(msg: TaroToH5Message): void {
  try {
    // 使用微信小程序 postMessage 机制与 WebView 通信
    // 实际使用时需要获取当前 WebView 上下文
    const pages = Taro.getCurrentPages();
    const currentPage = pages[pages.length - 1];
    if (currentPage && typeof (currentPage as Record<string, unknown>).$scope !== 'undefined') {
      // 通过小程序组件实例发送
      const scope = (currentPage as Record<string, unknown>).$scope as Record<string, unknown>;
      if (typeof scope.postMessage === 'function') {
        (scope.postMessage as (data: { data: unknown }) => void)({ data: msg });
      }
    }
  } catch {
    // postMessage 降级发送失败，静默处理
  }
}

// --------------------- PostMessage-Only Bridge Factory ---------------------

// S-7: 提取 postMessage-only 桥接工厂，消除重复代码
/**
 * 创建纯 postMessage 平台桥接适配器
 * 适用于支付宝、抖音、鸿蒙等不支持 WebSocket 的小程序平台
 *
 * NOTE: 此处使用 Taro 内部 $scope API 访问小程序组件实例。
 * 见 sendViaPostMessage 注释中的说明。
 */
function createPostMessageOnlyBridge(platform: string): PlatformBridge {
  let messageHandlers: Array<(msg: H5ToTaroMessage) => void> = [];
  let connected = false;

  return {
    platform,
    transport: 'postMessage',

    async connect(_configId: string, _modelId: string): Promise<void> {
      connected = true;
    },

    disconnect(): void {
      connected = false;
      messageHandlers = [];
    },

    sendMessage(msg: TaroToH5Message): void {
      if (!connected) return;
      try {
        // 各平台小程序 WebView 通信
        // NOTE: $scope 为 Taro 内部 API，参见 sendViaPostMessage 注释
        const pages = Taro.getCurrentPages();
        const currentPage = pages[pages.length - 1];
        if (currentPage && typeof (currentPage as Record<string, unknown>).$scope !== 'undefined') {
          const scope = (currentPage as Record<string, unknown>).$scope as Record<string, unknown>;
          if (typeof scope.postMessage === 'function') {
            (scope.postMessage as (data: { data: unknown }) => void)({ data: msg });
          }
        }
      } catch {
        // 发送失败静默处理
      }
    },

    onMessage(handler: (msg: H5ToTaroMessage) => void): void {
      messageHandlers.push(handler);
    },

    offMessage(handler: (msg: H5ToTaroMessage) => void): void {
      messageHandlers = messageHandlers.filter((h) => h !== handler);
    },

    isConnected(): boolean {
      return connected;
    },
  };
}

// --------------------- Alipay Adapter ---------------------

/** 创建支付宝平台桥接适配器 */
export function createAlipayBridge(): PlatformBridge {
  return createPostMessageOnlyBridge('alipay');
}

// --------------------- Douyin Adapter ---------------------

/** 创建抖音平台桥接适配器 */
export function createDouyinBridge(): PlatformBridge {
  return createPostMessageOnlyBridge('douyin');
}

// --------------------- HarmonyOS Adapter ---------------------

/** 创建鸿蒙平台桥接适配器 */
export function createHarmonyBridge(): PlatformBridge {
  return createPostMessageOnlyBridge('harmonyos');
}

// --------------------- Factory ---------------------

/** 根据当前运行平台自动选择适配器 */
export function createPlatformBridge(): PlatformBridge {
  try {
    const sysInfo = Taro.getSystemInfoSync();
    const platform = (sysInfo.platform || '').toLowerCase();

    if (platform.includes('alipay') || platform === 'ali') {
      return createAlipayBridge();
    }
    if (platform.includes('douyin') || platform.includes('tt')) {
      return createDouyinBridge();
    }
    if (platform.includes('harmony') || platform.includes('huawei')) {
      return createHarmonyBridge();
    }

    // 默认使用微信适配器 (wechat)
    return createWechatBridge();
  } catch {
    // getSystemInfoSync 失败时降级为微信适配器
    return createWechatBridge();
  }
}
