/**
 * WebView <-> Taro postMessage 通信协议类型定义
 * 与 webview/3d-renderer/types.ts 保持同步
 */

/** 消息类型枚举 */
export enum WebViewMessageType {
  // Taro -> H5
  MODEL_URL = 'MODEL_URL',
  SET_COLOR = 'SET_COLOR',
  SET_MATERIAL = 'SET_MATERIAL',
  RESET_VIEW = 'RESET_VIEW',
  CAPTURE = 'CAPTURE',
  PAUSE_RENDER = 'PAUSE_RENDER',
  RESUME_RENDER = 'RESUME_RENDER',
  PING = 'PING',

  // H5 -> Taro
  H5_READY = 'H5_READY',
  MODEL_LOADING = 'MODEL_LOADING',
  MODEL_READY = 'MODEL_READY',
  MODEL_ERROR = 'MODEL_ERROR',
  COLOR_APPLIED = 'COLOR_APPLIED',
  CAPTURE_RESULT = 'CAPTURE_RESULT',
  PONG = 'PONG',

  // Phase 2 (new) — Taro -> H5
  SET_PART_COLOR = 'SET_PART_COLOR',
  SET_MODE = 'SET_MODE',
  HIGHLIGHT_PART = 'HIGHLIGHT_PART',
  RESET_PARTS = 'RESET_PARTS',

  // Phase 2 (new) — H5 -> Taro
  PART_COLOR_APPLIED = 'PART_COLOR_APPLIED',

  // Phase 4 — Taro -> AR H5
  AR_UPDATE_CONFIG = 'AR_UPDATE_CONFIG',
  AR_CAPTURE = 'AR_CAPTURE',

  // Phase 4 — AR H5 -> Taro
  AR_READY = 'AR_READY',
  AR_MODEL_LOADING = 'AR_MODEL_LOADING',
  AR_MODEL_READY = 'AR_MODEL_READY',
  AR_ERROR = 'AR_ERROR',
  AR_CAPTURE_RESULT = 'AR_CAPTURE_RESULT',
  AR_UNSUPPORTED = 'AR_UNSUPPORTED',
}

/** 消息传输基本结构 */
export interface PostMessage<T = unknown> {
  type: WebViewMessageType;
  payload?: T;
  timestamp: number;
}

// Taro -> H5 消息

export interface ModelUrlMessage extends PostMessage<{ url: string }> {
  type: WebViewMessageType.MODEL_URL;
}

export interface SetColorMessage extends PostMessage<{ hex: string }> {
  type: WebViewMessageType.SET_COLOR;
}

export interface SetMaterialMessage extends PostMessage<{ material: string }> {
  type: WebViewMessageType.SET_MATERIAL;
}

export interface ResetViewMessage extends PostMessage<Record<string, never>> {
  type: WebViewMessageType.RESET_VIEW;
}

export interface CaptureMessage extends PostMessage<Record<string, never>> {
  type: WebViewMessageType.CAPTURE;
}

export interface PauseRenderMessage extends PostMessage<Record<string, never>> {
  type: WebViewMessageType.PAUSE_RENDER;
}

export interface ResumeRenderMessage extends PostMessage<Record<string, never>> {
  type: WebViewMessageType.RESUME_RENDER;
}

export interface PingMessage extends PostMessage<Record<string, never>> {
  type: WebViewMessageType.PING;
}

export type TaroToH5Message =
  | ModelUrlMessage
  | SetColorMessage
  | SetMaterialMessage
  | ResetViewMessage
  | CaptureMessage
  | PauseRenderMessage
  | ResumeRenderMessage
  | PingMessage
  // Phase 2 (new)
  | SetPartColorMessage
  | SetModeMessage
  | HighlightPartMessage
  | ResetPartsMessage;

// H5 -> Taro 消息

export interface H5ReadyMessage extends PostMessage<{ bridgeReady: boolean }> {
  type: WebViewMessageType.H5_READY;
}

export interface ModelLoadingMessage extends PostMessage<{ progress: number }> {
  type: WebViewMessageType.MODEL_LOADING;
}

export interface ModelReadyMessage extends PostMessage<Record<string, never>> {
  type: WebViewMessageType.MODEL_READY;
}

export interface ModelErrorMessage extends PostMessage<{ error: string; code?: string }> {
  type: WebViewMessageType.MODEL_ERROR;
}

export interface ColorAppliedMessage extends PostMessage<Record<string, never>> {
  type: WebViewMessageType.COLOR_APPLIED;
}

export interface CaptureResultMessage extends PostMessage<{ image: string }> {
  type: WebViewMessageType.CAPTURE_RESULT;
}

export interface PongMessage extends PostMessage<Record<string, never>> {
  type: WebViewMessageType.PONG;
}

export type H5ToTaroMessage =
  | H5ReadyMessage
  | ModelLoadingMessage
  | ModelReadyMessage
  | ModelErrorMessage
  | ColorAppliedMessage
  | CaptureResultMessage
  | PongMessage
  // Phase 2 (new)
  | PartColorAppliedMessage;

// === Phase 2 (new) message interfaces ===

/** Taro -> H5: 设置指定部件颜色 */
export interface SetPartColorMessage extends PostMessage<{ partCode: string; hex: string }> {
  type: WebViewMessageType.SET_PART_COLOR;
}

/** Taro -> H5: 切换全车/分区模式 */
export interface SetModeMessage extends PostMessage<{ mode: 'FULL' | 'PART' }> {
  type: WebViewMessageType.SET_MODE;
}

/** Taro -> H5: 高亮/取消高亮部件 */
export interface HighlightPartMessage extends PostMessage<{ partCode: string | null }> {
  type: WebViewMessageType.HIGHLIGHT_PART;
}

/** Taro -> H5: 重置所有部件为白色 */
export interface ResetPartsMessage extends PostMessage<Record<string, never>> {
  type: WebViewMessageType.RESET_PARTS;
}

/** H5 -> Taro: 部件颜色应用完成 */
export interface PartColorAppliedMessage extends PostMessage<{ partCode: string }> {
  type: WebViewMessageType.PART_COLOR_APPLIED;
}
