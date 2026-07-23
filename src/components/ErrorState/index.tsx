import { View, Text, Button } from '@tarojs/components';

interface ErrorStateProps {
  /** 错误文案 */
  message?: string;
  /** 重试回调 */
  onRetry?: () => void;
}

export default function ErrorState({
  message = '加载失败，请检查网络',
  onRetry,
}: ErrorStateProps) {
  return (
    <View className='error-state'>
      <View className='error-state-icon'>!</View>
      <Text className='error-state-message'>{message}</Text>
      {onRetry && (
        <Button className='error-state-retry' onClick={onRetry}>
          点击重试
        </Button>
      )}
    </View>
  );
}
