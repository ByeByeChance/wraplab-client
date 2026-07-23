/**
 * AR 模型加载器
 * 负责下载和加载 glTF/USDZ 格式的 3D 车模
 */
import { ArMessageType } from './types';
import { postToTaro } from './bridge';

interface LoadModelOptions {
  url: string;
  onProgress?: (progress: number) => void;
}

export interface LoadedModel {
  scene: unknown; // Three.js Group
  materials: Map<string, unknown>;
}

/**
 * 加载 glTF 模型
 * 当前为占位实现，实际 Three.js 集成在模型就绪后补充
 */
export async function loadModel(options: LoadModelOptions): Promise<LoadedModel | null> {
  const { url, onProgress } = options;

  if (!url) {
    postToTaro(ArMessageType.AR_ERROR, {
      error: 'AR 模型 URL 为空',
      code: 'EMPTY_URL',
    });
    return null;
  }

  try {
    postToTaro(ArMessageType.AR_MODEL_LOADING, { progress: 10 });

    // 发送进度更新
    if (onProgress) onProgress(30);

    // TODO: 实际 Three.js GLTFLoader 集成
    // const loader = new GLTFLoader();
    // const gltf = await loader.loadAsync(url, (xhr) => {
    //   const progress = (xhr.loaded / xhr.total) * 90;
    //   onProgress?.(progress);
    //   postToTaro(ArMessageType.AR_MODEL_LOADING, { progress });
    // });

    if (onProgress) onProgress(100);
    postToTaro(ArMessageType.AR_MODEL_LOADING, { progress: 100 });
    postToTaro(ArMessageType.AR_MODEL_READY, {});

    // 返回空占位 (后续替换为实际 Three.js scene)
    return {
      scene: null,
      materials: new Map(),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : '模型加载失败';
    postToTaro(ArMessageType.AR_ERROR, {
      error: message,
      code: 'LOAD_FAILED',
    });
    return null;
  }
}

/**
 * 应用颜色到模型材质
 */
export function applyColorToModel(
  model: LoadedModel | null,
  hex: string,
  _materialId?: string,
): void {
  if (!model || !hex) return;

  // TODO: 实际颜色应用
  // model.materials.forEach((material) => {
  //   material.color.set(hex);
  //   // 更新材质参数
  //   material.roughness = 0.6;
  //   material.metalness = 0.1;
  // });
}
