import { View, Text, Button } from '@tarojs/components';

interface QueueProgressProps {
  status: 'idle' | 'queued' | 'processing' | 'completed' | 'failed';
  queuePosition?: number;
  progress?: number;
  estimatedWaitSeconds?: number;
  errorMessage?: string;
  isQueueFull?: boolean;
  onRetry?: () => void;
  onBack?: () => void;
}

export default function QueueProgress({
  status,
  queuePosition = 0,
  progress = 0,
  estimatedWaitSeconds = 0,
  errorMessage,
  isQueueFull = false,
  onRetry,
  onBack,
}: QueueProgressProps) {
  if (status === 'idle' || status === 'completed') return null;

  const formatWaitTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds} 秒`;
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} 分钟`;
  };

  if (status === 'failed') {
    return (
      <View className='queue-progress failed'>
        <View className='queue-progress-bar-wrap'>
          <View className='queue-progress-bar error' style={{ width: '100%' }} />
        </View>
        <Text className='queue-progress-text error'>
          {errorMessage || '生成失败'}
        </Text>
        <View className='queue-progress-actions'>
          {isQueueFull && onRetry && (
            <Button className='queue-progress-btn primary' onClick={onRetry}>
              重新提交
            </Button>
          )}
          {onBack && (
            <Button className='queue-progress-btn secondary' onClick={onBack}>
              返回
            </Button>
          )}
        </View>
      </View>
    );
  }

  if (status === 'queued') {
    return (
      <View className='queue-progress queued'>
        <View className='queue-progress-bar-wrap'>
          <View
            className='queue-progress-bar queued'
            style={{ width: `${Math.max(5, progress || 25)}%` }}
          />
        </View>
        <Text className='queue-progress-text'>
          排队中，前方还有 {queuePosition} 个任务
        </Text>
        {estimatedWaitSeconds > 0 && (
          <Text className='queue-progress-wait'>
            预计等待 {formatWaitTime(estimatedWaitSeconds)}
          </Text>
        )}
      </View>
    );
  }

  if (status === 'processing') {
    return (
      <View className='queue-progress processing'>
        <View className='queue-progress-bar-wrap'>
          <View
            className='queue-progress-bar processing pulsating'
            style={{ width: `${Math.min(90, Math.max(50, progress))}%` }}
          />
        </View>
        <Text className='queue-progress-text'>
          AI 正在为您生成...
        </Text>
      </View>
    );
  }

  return null;
}
