import { useEffect, useState, useCallback } from 'react';
import Taro, { usePullDownRefresh, useReachBottom } from '@tarojs/taro';
import { View, Text, Image, ScrollView } from '@tarojs/components';
import { useFavoriteStore } from '../../../stores/favorite-store';
import LoadingSkeleton from '../../../components/LoadingSkeleton';
import EmptyState from '../../../components/EmptyState';
import ErrorState from '../../../components/ErrorState';
import type { FavoriteItem } from '../../../services/favorite.service';

export default function FavoritesPage() {
  const {
    favorites,
    favoritesLoading,
    favoritesError,
    hasMore,
    fetchFavorites,
    fetchMoreFavorites,
    refreshFavorites,
    removeFavorite,
  } = useFavoriteStore();

  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  /** 长按弹出操作项的 ID */
  const [actionItemId, setActionItemId] = useState<string | null>(null);

  /** 初始加载 */
  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  /** 下拉刷新 */
  usePullDownRefresh(() => {
    refreshFavorites().finally(() => {
      Taro.stopPullDownRefresh();
    });
  });

  /** 上拉加载更多 */
  useReachBottom(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setLoadMoreError(false);
    fetchMoreFavorites()
      .then(() => {
        setLoadingMore(false);
      })
      .catch(() => {
        setLoadMoreError(true);
        setLoadingMore(false);
      });
  });

  /** 点击收藏项 - 跳转对应详情 */
  const handleItemTap = useCallback((item: FavoriteItem) => {
    if (actionItemId) {
      setActionItemId(null);
      return;
    }
    if (item.targetType === 'case') {
      Taro.navigateTo({
        url: `/pages/cases/detail/index?id=${encodeURIComponent(item.targetId)}`,
      });
    } else {
      // configuration 类型 — 跳转改色工作台
      Taro.navigateTo({
        url: `/pages/design/index?modelId=&configurationId=${encodeURIComponent(item.targetId)}`,
      });
    }
  }, [actionItemId]);

  /** 长按弹出取消收藏 */
  const handleLongPress = useCallback((item: FavoriteItem) => {
    setActionItemId(item.targetId);
  }, []);

  /** 取消收藏操作 */
  const handleUnfavorite = useCallback(
    async (item: FavoriteItem) => {
      setActionItemId(null);
      const success = await removeFavorite(item.targetId);
      if (success) {
        Taro.showToast({ title: '已取消收藏', icon: 'none' });
      } else {
        Taro.showToast({ title: '操作失败，请重试', icon: 'none' });
      }
    },
    [removeFavorite],
  );

  /** 点击空白区域关闭操作菜单 */
  const handleDismissAction = useCallback(() => {
    setActionItemId(null);
  }, []);

  /** 图片加载失败 */
  const handleImageError = useCallback(() => {
    // 占位处理
  }, []);

  /** 重试加载 */
  const handleRetry = useCallback(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  /** 重试加载更多 */
  const handleLoadMoreRetry = useCallback(() => {
    setLoadMoreError(false);
    fetchMoreFavorites().catch(() => {
      setLoadMoreError(true);
    });
  }, [fetchMoreFavorites]);

  // Loading
  if (favoritesLoading) {
    return (
      <View className='page-container'>
        <View className='page-scroll'>
          <View className='favorites-grid'>
            <LoadingSkeleton type='case-card' count={6} />
          </View>
        </View>
      </View>
    );
  }

  // Error
  if (favoritesError) {
    return (
      <View className='page-container'>
        <ErrorState message={favoritesError} onRetry={handleRetry} />
      </View>
    );
  }

  // Empty
  if (favorites.length === 0) {
    return (
      <View className='page-container'>
        <EmptyState
          icon='⭐'
          message='暂无收藏'
          subMessage='浏览案例并收藏喜欢的方案吧'
        />
      </View>
    );
  }

  return (
    <View className='page-container' onClick={handleDismissAction}>
      <ScrollView className='page-scroll' scrollY onScrollToLower={handleRetry}>
        <View className='favorites-grid'>
          {favorites.map((item) => (
            <View
              key={item.id}
              className={`favorite-card ${actionItemId === item.targetId ? 'favorite-card--action' : ''}`}
              onClick={() => handleItemTap(item)}
            >
              {/* 缩略图 */}
              <View className='favorite-card-image-wrap'>
                {item.target.thumbnail ? (
                  <Image
                    className='favorite-card-image'
                    src={item.target.thumbnail}
                    mode='aspectFill'
                    onError={handleImageError}
                    onLongPress={() => handleLongPress(item)}
                  />
                ) : (
                  <View
                    className='favorite-card-image-placeholder'
                    onLongPress={() => handleLongPress(item)}
                  >
                    <Text className='favorite-card-image-placeholder-text'>
                      暂无图片
                    </Text>
                  </View>
                )}
                {/* 色块角标 */}
                {item.target.swatch.hex && (
                  <View
                    className='favorite-card-swatch-dot'
                    style={{ backgroundColor: item.target.swatch.hex }}
                  />
                )}
              </View>

              {/* 信息区 */}
              <View className='favorite-card-info'>
                <Text className='favorite-card-title' numberOfLines={1}>
                  {item.target.title}
                </Text>
                <Text className='favorite-card-swatch-name' numberOfLines={1}>
                  {item.target.swatch.brandName
                    ? `${item.target.swatch.brandName} ${item.target.swatch.name}`
                    : item.target.swatch.name}
                </Text>
              </View>

              {/* 长按操作层 */}
              {actionItemId === item.targetId && (
                <View
                  className='favorite-card-action-layer'
                >
                  <Text
                    className='favorite-card-action-text'
                    onClick={(e: { stopPropagation: () => void }) => {
                      e.stopPropagation();
                      handleUnfavorite(item);
                    }}
                  >
                    取消收藏
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* 底部加载状态 */}
        <View className='favorites-load-more'>
          {loadingMore && (
            <Text className='favorites-load-more-text'>加载中...</Text>
          )}
          {loadMoreError && (
            <Text className='favorites-load-more-error' onClick={handleLoadMoreRetry}>
              加载失败，点击重试
            </Text>
          )}
          {!hasMore && favorites.length > 0 && (
            <Text className='favorites-load-more-end'>—— 没有更多了 ——</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
