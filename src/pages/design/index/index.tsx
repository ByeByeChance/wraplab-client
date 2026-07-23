import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { View, Text, Button } from '@tarojs/components';
import { useConfigStore } from '../../../stores/config-store';
import { useColorStore } from '../../../stores/color-store';
import ThreeDViewer from '../../../components/ThreeDViewer';
import type { ThreeDViewerAPI } from '../../../components/ThreeDViewer';
import MaterialSelector from '../../../components/MaterialSelector';
import ColorSwatch from '../../../components/ColorSwatch';
import EmptyState from '../../../components/EmptyState';
import { navigateToQuote, navigateToCarSelect } from '../../../utils/navigate';
import { getUsdzInfo } from '../../../services/usdz.service';
import { debounce } from '../../../utils/debounce';
import { API_BASE_URL, API_PREFIX } from '../../../utils/constants';
import type { ColorSwatchItem, Material, UsdzDownloadState } from '../../../types';
import './index.less';

export default function DesignPage() {
  const router = useRouter();
  const { modelId } = router.params;

  const configStore = useConfigStore();
  const colorStore = useColorStore();

  const { currentModel, setModel } = configStore;
  const {
    colorBrands, colorBrandsLoading, colorBrandsError,
    swatches, swatchesLoading, swatchesError,
    selectedColorBrandId, selectedSwatch,
    materials, materialsLoading, materialsError,
    selectedMaterial,
    fetchColorBrands, selectColorBrand, selectSwatch, setCustomColor,
    fetchMaterials, selectMaterial,
    getActiveHex, getActiveSwatchInfo,
  } = colorStore;

  const [modelLoaded, setModelLoaded] = useState(false);
  const viewerRef = useRef<ThreeDViewerAPI | null>(null);

  // Phase 5: AR USDZ Quick Look state
  const [usdzState, setUsdzState] = useState<UsdzDownloadState>({
    downloading: false,
    progress: 0,
    error: null,
    localPath: null,
  });
  const [usdzAvailable, setUsdzAvailable] = useState(false);
  const [usdzChecked, setUsdzChecked] = useState(false);
  const usdzUrlRef = useRef<string | null>(null);

  // Phase 5: iOS platform check for AR Quick Look
  const isIOS12Plus = useMemo(() => {
    try {
      const sysInfo = Taro.getSystemInfoSync();
      const platform = sysInfo.platform || '';
      const version = sysInfo.system?.match(/[\d.]+/)?.[0] || '0';
      const majorVersion = parseInt(version.split('.')[0], 10) || 0;
      return platform.toLowerCase() === 'ios' && majorVersion >= 12;
    } catch {
      return false;
    }
  }, []);

  /** 3D 区域高度 */
  const viewportHeight = useMemo(() => {
    try {
      const sysInfo = Taro.getSystemInfoSync();
      const h = sysInfo.windowHeight || 667;
      return Math.floor(h * 0.5); // 50% 屏幕高度
    } catch {
      return 350; // fallback
    }
  }, []);

  /** 初始化：加载车型数据 */
  useEffect(() => {
    if (modelId) {
      // 简化：假设 modelId 可以直接从某个缓存获取
      // 实际应该调用 getConfigurationById 或者用现有数据
      // Phase 1: 创建临时 model 对象
      setModel({
        id: modelId,
        seriesId: '',
        name: '',
        year: 0,
        bodyType: '',
        model3dUrl: null, // Phase 1 默认无 3D 模型
      });
    }

    // 加载材质和色卡
    fetchMaterials();
    fetchColorBrands();
  }, [fetchMaterials, fetchColorBrands]);

  // Phase 5: Check USDZ availability for iOS AR Quick Look
  useEffect(() => {
    if (!modelId || !isIOS12Plus || usdzChecked) return;
    setUsdzChecked(true);
    getUsdzInfo(modelId)
      .then((info) => {
        if (info.available) {
          setUsdzAvailable(true);
          usdzUrlRef.current = info.url;
        }
      })
      .catch(() => {
        // USDZ not available - silent failure, button won't show
      });
  }, [modelId, isIOS12Plus, usdzChecked]);

  /** 获取当前车型的 3D 模型 URL */
  const model3dUrl = useMemo(() => {
    return currentModel?.model3dUrl || null;
  }, [currentModel]);

  /** 颜色防抖：发送 SET_COLOR 到 H5 */
  const debouncedSetColor = useMemo(() =>
    debounce((hex: string) => {
      if (viewerRef.current) {
        viewerRef.current.setColor(hex);
      }
    }, 300),
    []
  );

  /** 处理颜色选择 */
  const handleColorSelect = useCallback((swatch: ColorSwatchItem) => {
    selectSwatch(swatch);
    const hex = swatch.hex;
    if (hex && viewerRef.current) {
      debouncedSetColor(hex);
    }
  }, [selectSwatch, debouncedSetColor]);

  /** 处理自定义颜色 */
  const handleCustomColor = useCallback((hex: string) => {
    setCustomColor(hex);
    if (viewerRef.current) {
      viewerRef.current.setColor(hex);
    }
  }, [setCustomColor]);

  /** 处理材质选择 */
  const handleMaterialSelect = useCallback((material: Material) => {
    selectMaterial(material);
    if (viewerRef.current) {
      viewerRef.current.setMaterial(material.type);
    }
  }, [selectMaterial]);

  /** 处理品牌切换 */
  const handleBrandChange = useCallback((brandId: string) => {
    selectColorBrand(brandId);
  }, [selectColorBrand]);

  /** 解析当前颜色信息 */
  const activeSwatchInfo = getActiveSwatchInfo();

  /** 生成报价单 */
  const handleGenerateQuote = useCallback(() => {
    if (!modelId || !selectedSwatch || !selectedMaterial) return;

    // 暂不截图，直接跳转
    const hex = getActiveHex() || '';
    navigateToQuote({
      modelId: currentModel?.id || modelId,
      swatchId: selectedSwatch.id,
      materialId: selectedMaterial.id,
      hex,
    });
  }, [modelId, selectedSwatch, selectedMaterial, currentModel, getActiveHex]);

  // Phase 5: AR USDZ Quick Look handler
  const handleOpenAR = useCallback(async () => {
    if (!modelId || usdzState.downloading) return;
    const usdzUrl = usdzUrlRef.current;
    if (!usdzUrl) {
      Taro.showToast({ title: 'USDZ文件地址无效', icon: 'none' });
      return;
    }
    // Ensure URL is absolute
    const absoluteUrl = usdzUrl.startsWith('http') ? usdzUrl : `${API_BASE_URL}${API_PREFIX}${usdzUrl}`;
    setUsdzState({ downloading: true, progress: 0, error: null, localPath: null });
    try {
      const downloadTask = Taro.downloadFile({
        url: absoluteUrl,
        success(res) {
          if (res.statusCode === 200) {
            setUsdzState({ downloading: false, progress: 100, error: null, localPath: res.tempFilePath });
            // Open AR Quick Look - on iOS, opening a .usdz file automatically invokes AR Quick Look
            Taro.openDocument({
              filePath: res.tempFilePath,
              success() {
                // AR Quick Look opened successfully
              },
              fail() {
                Taro.showToast({ title: '无法打开AR预览', icon: 'none' });
              },
            });
          } else {
            setUsdzState({ downloading: false, progress: 0, error: '下载失败', localPath: null });
            Taro.showToast({ title: 'USDZ文件下载失败', icon: 'none' });
          }
        },
        fail() {
          setUsdzState({ downloading: false, progress: 0, error: '网络错误', localPath: null });
          Taro.showToast({ title: '下载失败，请检查网络', icon: 'none' });
        },
      });
      // Track download progress
      downloadTask.onProgressUpdate((res) => {
        setUsdzState((prev) => ({ ...prev, progress: res.progress }));
      });
    } catch {
      setUsdzState({ downloading: false, progress: 0, error: '未知错误', localPath: null });
      Taro.showToast({ title: 'AR预览启动失败', icon: 'none' });
    }
  }, [modelId, usdzState.downloading]);

  /** 无车型参数时的空状态 (从 Tab 直接进入) */
  if (!modelId) {
    return (
      <View className='page-container design-page'>
        <View className='design-empty-container'>
          <EmptyState
            icon='🚗'
            message='请先选择车型开始设计'
            actionText='去选车型'
            onAction={() => navigateToCarSelect()}
          />
        </View>
      </View>
    );
  }

  const canGenerateQuote = Boolean(activeSwatchInfo) && Boolean(selectedMaterial);

  return (
    <View className='page-container design-page'>
      <View className='design-viewport' style={{ height: `${viewportHeight}px` }}>
        <ThreeDViewer
          modelUrl={model3dUrl}
          onReady={() => setModelLoaded(true)}
          onRef={(api: ThreeDViewerAPI) => { viewerRef.current = api; }}
        />
      </View>

      {/* 顶部颜色信息栏 */}
      <View className='design-info-bar'>
        {currentModel && (
          <Text className='design-info-model'>
            {currentModel.name || '车型'}
          </Text>
        )}
        <Text className='design-info-separator'>|</Text>
        {activeSwatchInfo ? (
          <View className='design-info-color'>
            <View
              className='design-info-color-block'
              style={{ backgroundColor: activeSwatchInfo.hex }}
            />
            <Text className='design-info-color-text'>
              {activeSwatchInfo.name}
            </Text>
          </View>
        ) : (
          <Text className='design-info-color-text design-info-color-text--placeholder'>
            请选择颜色
          </Text>
        )}
        {modelLoaded && (
          <Text
            className='design-info-reset'
            onClick={() => viewerRef.current?.resetView()}
          >
            重置视角
          </Text>
        )}
      </View>

      {/* 材质选择器 */}
      <MaterialSelector
        materials={materials}
        selectedId={selectedMaterial?.id}
        loading={materialsLoading}
        error={Boolean(materialsError)}
        onSelect={handleMaterialSelect}
        onRetry={fetchMaterials}
      />

      {/* 色卡选择面板 */}
      <View className='design-swatch-panel'>
        <ColorSwatch
          brands={colorBrands}
          swatches={swatches}
          selectedHex={activeSwatchInfo?.hex}
          brandsLoading={colorBrandsLoading}
          swatchesLoading={swatchesLoading}
          brandsError={Boolean(colorBrandsError)}
          swatchesError={Boolean(swatchesError)}
          selectedBrandId={selectedColorBrandId || undefined}
          onBrandChange={handleBrandChange}
          onColorSelect={handleColorSelect}
          onCustomColor={handleCustomColor}
          onBrandsRetry={fetchColorBrands}
          onSwatchesRetry={() => selectedColorBrandId && colorStore.fetchSwatches(selectedColorBrandId)}
        />
      </View>

      {/* Phase 5: AR Quick Look button (iOS only) */}
      {usdzAvailable && (
        <View style={{ padding: '0 32rpx 12rpx', background: '#FFFFFF' }}>
          <Button
            style={{
              height: '80rpx',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: usdzState.downloading ? '#BFBFBF' : '#16213E',
              borderRadius: '8rpx',
              border: '1px solid #0F3460',
              opacity: usdzState.downloading ? 0.6 : 1,
            }}
            onClick={handleOpenAR}
            disabled={usdzState.downloading}
            loading={usdzState.downloading}
          >
            <Text style={{ fontSize: '28rpx', color: '#FFFFFF' }}>
              {usdzState.downloading
                ? `下载中 ${usdzState.progress}%`
                : 'AR 快速预览 (iOS)'}
            </Text>
          </Button>
        </View>
      )}

      {/* 生成报价单按钮 */}
      <View className='design-quote-btn-wrap'>
        <Button
          className={`btn-primary ${!canGenerateQuote ? 'btn-primary--disabled' : ''}`}
          onClick={handleGenerateQuote}
          disabled={!canGenerateQuote}
        >
          生成报价单
        </Button>
      </View>
    </View>
  );
}
