import { useState, useRef, useCallback, useEffect } from 'react';
import { View, Button } from '@tarojs/components';
import { MESSAGE_TIMEOUT } from '../../utils/constants';
import { WebViewMessageType } from '../../types/message';
import type { H5ToTaroMessage, TaroToH5Message, SetColorMessage, SetMaterialMessage } from '../../types/message';

/** 父组件通过 ref 调用的方法 */
export interface ThreeDViewerAPI {
  setColor: (hex: string) => void;
  setMaterial: (material: string) => void;
  resetView: () => void;
  capture: () => void;
}

interface ThreeDViewerProps {
  /** 3D 模型 GLB 文件 URL (为空时展示降级占位) */
  modelUrl: string | null;
  /** 模型加载进度回调 (0-100) */
  onProgress?: (progress: number) => void;
  /** 模型就绪回调 */
  onReady?: () => void;
  /** 模型加载失败回调 */
  onError?: (error: string) => void;
  /** 颜色应用成功回调 */
  onColorApplied?: () => void;
  /** 截图完成回调 (base64) */
  onCapture?: (imageBase64: string) => void;
  /** 暴露给父组件的 API */
  onRef?: (api: ThreeDViewerAPI) => void;
}

/** 模型加载状态 */
type ViewerStatus = 'idle' | 'loading' | 'ready' | 'error' | 'no-model';

/** WebView 3D H5 页面基础路径 */
const WEBVIEW_BASE_SRC = '/webview/3d-renderer/index.html';
/** 消息队列刷新间隔 (ms) */
const MSG_FLUSH_INTERVAL = 100;

export default function ThreeDViewer({
  modelUrl,
  onProgress,
  onReady,
  onError,
  onColorApplied,
  onCapture,
  onRef,
}: ThreeDViewerProps) {
  const [status, setStatus] = useState<ViewerStatus>(modelUrl ? 'loading' : 'no-model');
  const [progress, setProgress] = useState(0);
  const [webViewSrc, setWebViewSrc] = useState(WEBVIEW_BASE_SRC);
  const [errorMsg, setErrorMsg] = useState('');
  const isReadyRef = useRef(false);
  const msgQueueRef = useRef<TaroToH5Message[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** 向 H5 发送消息 — 通过 URL hash bridge (hash 变化不触发 WebView 重载) */
  const postMessage = useCallback((msg: TaroToH5Message) => {
    msgQueueRef.current.push(msg);
  }, []);

  /** 刷新消息队列到 WebView src hash */
  useEffect(() => {
    flushTimerRef.current = setInterval(() => {
      const queue = msgQueueRef.current;
      if (queue.length === 0) return;

      // 取出所有待发送消息，编码为 JSON 数组写入 hash
      const batch = queue.splice(0, queue.length);
      const hash = encodeURIComponent(JSON.stringify(batch));
      setWebViewSrc(`${WEBVIEW_BASE_SRC}#msg=${hash}`);
    }, MSG_FLUSH_INTERVAL);

    return () => {
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
    };
  }, []);

  /** 暴露 API 给父组件 */
  useEffect(() => {
    if (onRef) {
      onRef({
        setColor: (hex: string) => {
          postMessage({
            type: WebViewMessageType.SET_COLOR,
            payload: { hex },
            timestamp: Date.now(),
          } as SetColorMessage);
        },
        setMaterial: (material: string) => {
          postMessage({
            type: WebViewMessageType.SET_MATERIAL,
            payload: { material },
            timestamp: Date.now(),
          } as SetMaterialMessage);
        },
        resetView: () => {
          postMessage({
            type: WebViewMessageType.RESET_VIEW,
            payload: {},
            timestamp: Date.now(),
          });
        },
        capture: () => {
          postMessage({
            type: WebViewMessageType.CAPTURE,
            payload: {},
            timestamp: Date.now(),
          });
        },
      });
    }
  }, [onRef, postMessage]);

  /** modelUrl 变化时的处理 */
  useEffect(() => {
    if (!modelUrl) {
      setStatus('no-model');
      isReadyRef.current = false;
      return;
    }
    setStatus('loading');
    setProgress(0);
    setErrorMsg('');

    // 将 modelUrl 加入消息队列，等待 H5 就绪后发送
    postMessage({
      type: WebViewMessageType.MODEL_URL,
      payload: { url: modelUrl },
      timestamp: Date.now(),
    });

    // 超时检测
    const timeout = setTimeout(() => {
      if (!isReadyRef.current) {
        setStatus('error');
        setErrorMsg('模型加载超时');
        onError?.('模型加载超时');
      }
    }, MESSAGE_TIMEOUT.MODEL_LOAD);

    return () => clearTimeout(timeout);
  }, [modelUrl, onError, postMessage]);

  /** 处理 H5 发来的消息 */
  const handleMessage = useCallback((e: { detail?: { data?: H5ToTaroMessage[] } }) => {
    const messages = e?.detail?.data;
    if (!messages || !Array.isArray(messages)) return;

    for (const msg of messages) {
      switch (msg.type) {
        case WebViewMessageType.H5_READY:
          // H5 就绪 — 若 modelUrl 存在但尚未就绪，直接入列发送
          if (!isReadyRef.current && modelUrl) {
            postMessage({
              type: WebViewMessageType.MODEL_URL,
              payload: { url: modelUrl },
              timestamp: Date.now(),
            });
          }
          break;

        case WebViewMessageType.MODEL_LOADING:
          if (msg.payload && typeof msg.payload.progress === 'number') {
            setProgress(msg.payload.progress);
            onProgress?.(msg.payload.progress);
          }
          break;

        case WebViewMessageType.MODEL_READY:
          isReadyRef.current = true;
          setStatus('ready');
          onReady?.();
          break;

        case WebViewMessageType.MODEL_ERROR:
          setStatus('error');
          setErrorMsg(msg.payload?.error || '模型加载失败');
          onError?.(msg.payload?.error || '模型加载失败');
          break;

        case WebViewMessageType.COLOR_APPLIED:
          onColorApplied?.();
          break;

        case WebViewMessageType.CAPTURE_RESULT:
          if (msg.payload?.image) {
            onCapture?.(msg.payload.image);
          }
          break;

        default:
          break;
      }
    }
  }, [postMessage, onProgress, onReady, onError, onColorApplied, onCapture]);

  /** 重新加载 */
  const handleReload = useCallback(() => {
    // 通过添加随机参数强制 WebView 重新加载
    setWebViewSrc(`${WEBVIEW_BASE_SRC}?reload=${Date.now()}`);
    setStatus('loading');
    setProgress(0);
    setErrorMsg('');
    isReadyRef.current = false;
  }, []);

  // 无模型 URL — 展示降级占位，不渲染 WebView
  const showWebView = status !== 'no-model';

  return (
    <View className='three-d-viewer'>
      {/* WebView 始终渲染（loading/ready/error 状态），确保 H5 页面加载 */}
      {showWebView && (
        /* @ts-ignore - Taro WebView 组件 */
        <web-view
          src={webViewSrc}
          onMessage={handleMessage}
          className={`three-d-webview ${status === 'ready' ? '' : 'three-d-webview--hidden'}`}
        />
      )}

      {/* 无模型 URL */}
      {status === 'no-model' && (
        <View className='three-d-overlay three-d-overlay--empty'>
          <View className='three-d-placeholder'>
            <View className='three-d-placeholder-icon'>🚗</View>
            <View className='three-d-placeholder-text'>3D 模型暂未上线</View>
            <View className='three-d-placeholder-sub'>敬请期待，您仍可浏览色卡</View>
          </View>
        </View>
      )}

      {/* 加载中 */}
      {status === 'loading' && (
        <View className='three-d-overlay three-d-overlay--loading'>
          <View className='three-d-loading'>
            <View className='three-d-spinner' />
            <View className='three-d-loading-text'>模型加载中 {progress}%...</View>
            <View className='three-d-progress-bar'>
              <View
                className='three-d-progress-fill'
                style={{ width: `${progress}%` }}
              />
            </View>
          </View>
        </View>
      )}

      {/* 加载失败 */}
      {status === 'error' && (
        <View className='three-d-overlay three-d-overlay--error'>
          <View className='three-d-error'>
            <View className='three-d-error-icon'>!</View>
            <View className='three-d-error-text'>{errorMsg || '模型加载失败'}</View>
            <View className='three-d-error-actions'>
              <Button className='three-d-error-btn' onClick={handleReload}>
                重新加载
              </Button>
              <Button className='three-d-error-btn three-d-error-btn--secondary'>
                继续浏览色卡
              </Button>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
