import { View, Text } from '@tarojs/components';

interface CustomerCareBannerProps {
  birthdayCount: number;
  anniversaryCount: number;
  loading?: boolean;
  error?: string | null;
  expanded?: boolean;
  onViewDetail?: () => void;
  onToggleExpand?: () => void;
  onRetry?: () => void;
}

export default function CustomerCareBanner({
  birthdayCount,
  anniversaryCount,
  loading = false,
  error = null,
  expanded = false,
  onViewDetail,
  onToggleExpand,
  onRetry,
}: CustomerCareBannerProps) {
  // Loading state — render a skeleton placeholder
  if (loading) {
    return (
      <View className='customer-care-banner customer-care-banner--loading'>
        <View className='customer-care-summary'>
          <Text className='customer-care-icon'>🎂</Text>
          <View className='customer-care-info'>
            <Text className='customer-care-text customer-care-text--skeleton'>
              正在获取客户关怀提醒...
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // Error state — compact error with retry
  if (error && birthdayCount === 0 && anniversaryCount === 0) {
    return (
      <View className='customer-care-banner customer-care-banner--error'>
        <View className='customer-care-summary'>
          <Text className='customer-care-icon'>⚠️</Text>
          <View className='customer-care-info'>
            <Text className='customer-care-text'>{error}</Text>
            {onRetry && (
              <Text
                className='customer-care-retry'
                onClick={(e) => {
                  e.stopPropagation();
                  onRetry();
                }}
              >
                重试
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  }

  // 无提醒时不渲染
  if (birthdayCount === 0 && anniversaryCount === 0) return null;

  return (
    <View className='customer-care-banner' onClick={onToggleExpand}>
      <View className='customer-care-summary'>
        <Text className='customer-care-icon'>🎂</Text>
        <View className='customer-care-info'>
          {birthdayCount > 0 && (
            <Text className='customer-care-text'>
              您有 {birthdayCount} 位客户本月生日
            </Text>
          )}
          {anniversaryCount > 0 && (
            <Text className='customer-care-text'>
              {birthdayCount > 0 ? '，' : ''}{anniversaryCount} 位客户纪念日
            </Text>
          )}
        </View>
        {onViewDetail && (
          <Text className='customer-care-arrow'>{expanded ? '▲' : '▼'}</Text>
        )}
      </View>

      {expanded && onViewDetail && (
        <View className='customer-care-detail'>
          <Text
            className='customer-care-detail-btn'
            onClick={(e) => {
              e.stopPropagation();
              onViewDetail();
            }}
          >
            查看详情
          </Text>
        </View>
      )}
    </View>
  );
}
