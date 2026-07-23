/**
 * AR 预览 H5 入口
 * WebXR 场景初始化、模型加载、颜色叠加
 */
import { initMessageListener, postToTaro, onMessage } from './bridge';
import { ArMessageType } from './types';
import type { ArUpdateConfigPayload } from './types';
import { applyColorToModel } from './model-loader';
import type { LoadedModel } from './model-loader';

// 全局状态
let currentModel: LoadedModel | null = null;

/**
 * 检测 WebXR AR 支持
 */
async function checkArSupport(): Promise<boolean> {
  if (typeof navigator === 'undefined') return false;

  const nav = navigator as Navigator & {
    xr?: {
      isSessionSupported?: (mode: string) => Promise<boolean>;
    };
  };

  if (!nav.xr || !nav.xr.isSessionSupported) {
    return false;
  }

  try {
    return await nav.xr.isSessionSupported('immersive-ar');
  } catch {
    return false;
  }
}

/**
 * 初始化 AR 场景
 */
async function initArScene(): Promise<void> {
  const canvas = document.getElementById('ar-canvas') as HTMLCanvasElement;
  if (!canvas) return;

  // 隐藏 loading
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.style.display = 'none';
  }

  // TODO: 实际 Three.js + WebXR 集成
  // const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
  // renderer.xr.enabled = true;
  // const scene = new THREE.Scene();
  // const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 10);
  // ...
}

/**
 * 处理颜色配置更新
 */
function handleUpdateConfig(payload: ArUpdateConfigPayload): void {
  applyColorToModel(currentModel, payload.hex, payload.materialId);
}

/**
 * 应用入口
 */
async function main(): Promise<void> {
  initMessageListener();

  // 注册消息处理器
  onMessage(ArMessageType.AR_UPDATE_CONFIG, (payload) => {
    handleUpdateConfig(payload as ArUpdateConfigPayload);
  });

  onMessage(ArMessageType.AR_CAPTURE, () => {
    // TODO: 截图功能
    postToTaro(ArMessageType.AR_CAPTURE_RESULT, {
      image: '',
    });
  });

  // 检测 AR 支持
  const supported = await checkArSupport();

  if (!supported) {
    // 显示不支持降级页
    const unsupportedOverlay = document.getElementById('unsupported-overlay');
    if (unsupportedOverlay) {
      unsupportedOverlay.style.display = 'flex';
    }
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.style.display = 'none';
    }

    postToTaro(ArMessageType.AR_UNSUPPORTED, {
      reason: 'webxr_not_available',
    });
    return;
  }

  // AR 就绪
  postToTaro(ArMessageType.AR_READY, { supported: true });

  // 初始化 AR 场景
  await initArScene();

  // TODO: 加载模型
  // 读取 URL 参数获取配置
  // const urlParams = new URLSearchParams(window.location.search);
  // const configId = urlParams.get('configurationId');
  // if (configId) {
  //   // 获取 AR 纹理配置...
  // }
}

// 启动
void main();
