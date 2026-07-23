import { useEffect, useState, useCallback } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { View, Text, WebView, Button } from '@tarojs/components';
import ArFallback from '../../../../components/ArFallback/index';
import { getArTexture, ArTextureConfig } from '../../../../services/ar.service';
import type { PostMessage } from '../../../../types';
import { WEBVIEW_BASE_PATH } from '../../../../utils/constants';

export default function ArPreviewPage() {
  const router = useRouter();
  const configurationId = router.params.configurationId as string;

  const [loading, setLoading] = useState(true);
  const [arSupported, setArSupported] = useState<boolean | null>(null);
  const [, setArConfig] = useState<ArTextureConfig | null>(null);
  const [unsupportedReason, setUnsupportedReason] = useState<string>('webxr_not_available');
  const [error, setError] = useState<string | null>(null);

  /** Load AR texture config */
  useEffect(() => {
    if (!configurationId) return;
    getArTexture(configurationId)
      .then((config) => {
        setArConfig(config);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'AR 配置加载失败');
        setLoading(false);
      });
  }, [configurationId]);

  /** Handle WebView messages */
  const handleMessage = useCallback(
    (e: { detail: { data: PostMessage<ArTextureConfig>[] } }) => {
      const messages = e.detail.data;
      if (!messages || messages.length === 0) return;

      const msg = messages[messages.length - 1];

      switch (msg.type) {
        case 'H5_READY':
          setLoading(false);
          break;

        case 'AR_READY': {
          const payload = msg.payload as { supported: boolean } | undefined;
          if (payload?.supported === false) {
            setArSupported(false);
            setUnsupportedReason('webxr_not_available');
          } else {
            setArSupported(true);
            setLoading(false);
          }
          break;
        }

        case 'AR_UNSUPPORTED': {
          setArSupported(false);
          const payload = msg.payload as { reason: string } | undefined;
          setUnsupportedReason(payload?.reason ?? 'webxr_not_available');
          break;
        }

        case 'AR_ERROR': {
          setError('AR 加载失败');
          setArSupported(false);
          break;
        }

        default:
          break;
      }
    },
    [],
  );

  /** Handle back */
  const handleBack = useCallback(() => {
    Taro.navigateBack({ delta: 1 });
  }, []);

  /** Handle retry */
  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
    setArSupported(null);
  }, []);

  /** Handle view 3D */
  const handleView3D = useCallback(() => {
    Taro.navigateBack({ delta: 1 });
  }, []);

  /** Handle view cases */
  const handleViewCases = useCallback(() => {
    Taro.switchTab({ url: '/pages/cases/index' });
  }, []);

  // Loading state
  if (loading) {
    return (
      <View className='page-container ar-preview-page'>
        <View className='ar-loading'>
          <View className='ar-loading-spinner' />
          <Text className='ar-loading-text'>正在初始化 AR...</Text>
          <Text className='ar-loading-guide'>请将摄像头对准车辆</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View className='page-container ar-preview-page'>
        <ArFallback
          reason='load_failed'
          onRetry={handleRetry}
          onView3D={handleView3D}
          onBack={handleBack}
        />
      </View>
    );
  }

  // Unsupported state
  if (arSupported === false) {
    return (
      <View className='page-container ar-preview-page'>
        <ArFallback
          reason={unsupportedReason as 'webxr_not_available' | 'unsupported_device' | 'browser_version' | 'model_not_configured' | 'load_failed'}
          onView3D={handleView3D}
          onViewCases={handleViewCases}
          onBack={handleBack}
        />
      </View>
    );
  }

  // Success - AR WebView
  const arWebViewUrl = `${WEBVIEW_BASE_PATH.replace('3d-renderer', 'ar-renderer')}?configurationId=${encodeURIComponent(configurationId || '')}`;

  return (
    <View className='page-container ar-preview-page'>
      <WebView
        src={arWebViewUrl}
        onMessage={handleMessage}
        className='ar-webview'
      />

      {/* Bottom control bar */}
      <View className='ar-control-bar'>
        <Button className='ar-control-btn' onClick={handleBack}>
          退出
        </Button>
        <View className='ar-control-center'>
          <Text className='ar-control-hint'>移动设备查看不同角度效果</Text>
        </View>
        <Button className='ar-control-btn'>
          截图
        </Button>
      </View>
    </View>
  );
}
