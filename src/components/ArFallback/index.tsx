import { View, Text, Button } from '@tarojs/components';

interface ArFallbackProps {
  reason: 'webxr_not_available' | 'unsupported_device' | 'browser_version' | 'model_not_configured' | 'load_failed';
  onView3D?: () => void;
  onViewCases?: () => void;
  onRetry?: () => void;
  onBack?: () => void;
}

const REASON_CONFIG: Record<string, { title: string; message: string; showRetry: boolean }> = {
  webxr_not_available: {
    title: 'AR 预览暂不可用',
    message: '当前平台不支持 AR 功能，请使用最新版微信打开',
    showRetry: false,
  },
  unsupported_device: {
    title: '设备不支持 AR',
    message: '您的设备暂不支持 AR 功能，建议使用较新的手机',
    showRetry: false,
  },
  browser_version: {
    title: '微信版本过低',
    message: '请升级到微信 8.0 及以上版本体验 AR 功能',
    showRetry: false,
  },
  model_not_configured: {
    title: 'AR 预览暂不支持此车型',
    message: '该车型暂未配置 AR 模型，可查看 3D 模型或案例实拍',
    showRetry: false,
  },
  load_failed: {
    title: 'AR 加载失败',
    message: 'AR 模型加载失败，请检查网络后重试',
    showRetry: true,
  },
};

export default function ArFallback({
  reason,
  onView3D,
  onViewCases,
  onRetry,
  onBack,
}: ArFallbackProps) {
  const config = REASON_CONFIG[reason] || {
    title: 'AR 功能不可用',
    message: '当前不支持 AR 预览',
    showRetry: false,
  };

  return (
    <View className='ar-fallback'>
      <View className='ar-fallback-icon'>
        <Text className='ar-fallback-emoji'>📱</Text>
      </View>
      <Text className='ar-fallback-title'>{config.title}</Text>
      <Text className='ar-fallback-message'>{config.message}</Text>
      <View className='ar-fallback-actions'>
        {config.showRetry && onRetry && (
          <Button className='ar-fallback-btn primary' onClick={onRetry}>
            重试
          </Button>
        )}
        {onView3D && (
          <Button className='ar-fallback-btn secondary' onClick={onView3D}>
            查看 3D 模型
          </Button>
        )}
        {onViewCases && (
          <Button className='ar-fallback-btn secondary' onClick={onViewCases}>
            查看案例实拍
          </Button>
        )}
        {onBack && (
          <Button className='ar-fallback-btn secondary' onClick={onBack}>
            返回工作台
          </Button>
        )}
      </View>
    </View>
  );
}
