/**
 * AR WebView <-> Taro postMessage 通信协议类型定义
 * 与 src/types/message.d.ts 保持同步
 */

export enum ArMessageType {
  // Taro -> AR H5
  AR_UPDATE_CONFIG = 'AR_UPDATE_CONFIG',
  AR_CAPTURE = 'AR_CAPTURE',

  // AR H5 -> Taro
  AR_READY = 'AR_READY',
  AR_MODEL_LOADING = 'AR_MODEL_LOADING',
  AR_MODEL_READY = 'AR_MODEL_READY',
  AR_ERROR = 'AR_ERROR',
  AR_CAPTURE_RESULT = 'AR_CAPTURE_RESULT',
  AR_UNSUPPORTED = 'AR_UNSUPPORTED',
}

export interface ArMessage<T = unknown> {
  type: ArMessageType;
  payload?: T;
  timestamp: number;
}

export interface ArUpdateConfigPayload {
  hex: string;
  materialId?: string;
}

export interface ArReadyPayload {
  supported: boolean;
}

export interface ArModelLoadingPayload {
  progress: number;
}

export interface ArErrorPayload {
  error: string;
  code: string;
}

export interface ArCaptureResultPayload {
  image: string;
}

export interface ArUnsupportedPayload {
  reason: string;
}
