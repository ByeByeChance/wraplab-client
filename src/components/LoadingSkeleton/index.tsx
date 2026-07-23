import { View } from '@tarojs/components';

interface LoadingSkeletonProps {
  /** 骨架屏类型 */
  type: 'brand-grid' | 'scheme-list' | 'swatch-grid' | 'case-card' | 'profile' | 'list-item' | 'circle' | 'rect';
  /** 骨架屏数量 */
  count?: number;
  /** 自定义高度 */
  height?: string;
}

export default function LoadingSkeleton({ type, count = 1, height }: LoadingSkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  const renderItem = (key: number) => {
    switch (type) {
      case 'brand-grid':
        return (
          <View key={key} className='skeleton-brand-item'>
            <View className='skeleton-shimmer skeleton-brand-logo' />
            <View className='skeleton-shimmer skeleton-brand-name' />
          </View>
        );
      case 'scheme-list':
        return (
          <View key={key} className='skeleton-card'>
            <View className='skeleton-shimmer skeleton-card-image' />
            <View className='skeleton-card-body'>
              <View className='skeleton-shimmer skeleton-line' style={{ width: '70%' }} />
              <View className='skeleton-shimmer skeleton-line' style={{ width: '50%' }} />
            </View>
          </View>
        );
      case 'swatch-grid':
        return (
          <View key={key} className='skeleton-swatch-item'>
            <View className='skeleton-shimmer skeleton-swatch-block' />
          </View>
        );
      case 'case-card':
        return (
          <View key={key} className='skeleton-case-card'>
            <View className='skeleton-shimmer skeleton-case-image' />
            <View className='skeleton-case-body'>
              <View className='skeleton-shimmer skeleton-line' />
              <View className='skeleton-shimmer skeleton-line' style={{ width: '60%' }} />
            </View>
          </View>
        );
      case 'list-item':
        return (
          <View key={key} className='skeleton-list-item'>
            <View className='skeleton-shimmer skeleton-circle' />
            <View className='skeleton-list-body'>
              <View className='skeleton-shimmer skeleton-line' />
              <View className='skeleton-shimmer skeleton-line' style={{ width: '60%' }} />
            </View>
          </View>
        );
      case 'circle':
        return (
          <View
            key={key}
            className='skeleton-shimmer'
            style={{
              width: height || '64rpx',
              height: height || '64rpx',
              borderRadius: '50%',
            }}
          />
        );
      case 'rect':
        return (
          <View
            key={key}
            className='skeleton-shimmer'
            style={{
              width: '100%',
              height: height || '32rpx',
              borderRadius: '8rpx',
            }}
          />
        );
      default:
        return (
          <View key={key} className='skeleton-shimmer skeleton-line' />
        );
    }
  };

  return <View className='skeleton-container'>{items.map(renderItem)}</View>;
}
