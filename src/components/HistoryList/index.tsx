import { View, Text } from '@tarojs/components';
import React from 'react';
import EmptyState from '../EmptyState';
import ErrorState from '../ErrorState';
import './index.less';

interface HistoryListProps<T> {
  items: T[];
  loading?: boolean;
  refreshing?: boolean;
  error?: string | null;
  hasMore: boolean;
  emptyMessage: string;
  emptyIcon?: string;
  emptyActionText?: string;
  onEmptyAction?: () => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  onItemTap?: (item: T, index: number) => void;
  onLoadMore: () => void;
  onRetry: () => void;
  loadMoreText?: string;
}

function HistoryList<T>({
  items,
  loading,
  refreshing,
  error,
  hasMore,
  emptyMessage,
  emptyIcon = '📋',
  emptyActionText,
  onEmptyAction,
  renderItem,
  onItemTap,
  onLoadMore,
  onRetry,
  loadMoreText,
}: HistoryListProps<T>): React.ReactElement {
  // Loading skeleton (first load — no items yet)
  if (loading && items.length === 0) {
    return (
      <View className='history-list'>
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} className='history-list-skeleton-item' />
        ))}
      </View>
    );
  }

  // Error state (first load — no items yet)
  if (error && items.length === 0 && !loading) {
    return (
      <View className='history-list'>
        <ErrorState message={error} onRetry={onRetry} />
      </View>
    );
  }

  // Empty state
  if (!loading && !error && items.length === 0) {
    return (
      <View className='history-list'>
        <EmptyState
          icon={emptyIcon}
          message={emptyMessage}
          actionText={emptyActionText}
          onAction={onEmptyAction}
        />
      </View>
    );
  }

  // Success state
  return (
    <View className='history-list'>
      {items.map((item, index) => (
        <View
          key={index}
          className='history-list-item'
          onClick={() => onItemTap?.(item, index)}
        >
          {renderItem(item, index)}
        </View>
      ))}
      {/* Load more area */}
      <View className='history-list-footer'>
        {loading && items.length > 0 && (
          <Text className='history-list-footer-text'>
            {loadMoreText || '加载中...'}
          </Text>
        )}
        {refreshing && (
          <Text className='history-list-footer-text history-list-footer-text-refreshing'>
            正在刷新...
          </Text>
        )}
        {!loading && !refreshing && hasMore && (
          <View onClick={onLoadMore}>
            <Text className='history-list-footer-action'>加载更多</Text>
          </View>
        )}
        {!hasMore && items.length > 0 && (
          <Text className='history-list-footer-text'>没有更多了</Text>
        )}
        {error && items.length > 0 && !loading && (
          <View onClick={onRetry}>
            <Text className='history-list-footer-error'>加载失败，点击重试</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default HistoryList;
