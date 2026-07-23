import { View, Text } from '@tarojs/components';
import type { OfflineIndicatorProps } from '../../../types';
import './index.less';

export default function OfflineIndicator({
  isOffline,
  isRecovering,
  isFirstOffline,
  onDismissGuide,
}: OfflineIndicatorProps) {
  if (!isOffline && !isRecovering) {
    return null;
  }

  return (
    <View className='offline-indicator'>
      {isOffline && (
        <View className='offline-indicator-bar offline-indicator-bar--offline'>
          <Text className='offline-indicator-icon'>⚠</Text>
          <Text className='offline-indicator-text'>当前处于离线状态，展示缓存数据</Text>
          {isFirstOffline && (
            <View className='offline-indicator-guide' onClick={() => onDismissGuide()}>
              <View className='offline-indicator-guide-arrow' />
              <Text className='offline-indicator-guide-text'>
                已自动切换到离线模式，您可继续浏览最近看过的内容
              </Text>
            </View>
          )}
        </View>
      )}

      {isRecovering && (
        <View className='offline-indicator-bar offline-indicator-bar--recovering'>
          <Text className='offline-indicator-icon'>✓</Text>
          <Text className='offline-indicator-text'>网络已恢复</Text>
        </View>
      )}
    </View>
  );
}
