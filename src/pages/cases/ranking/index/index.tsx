import { useEffect, useCallback } from 'react';
import Taro, { useRouter, usePullDownRefresh, useReachBottom } from '@tarojs/taro';
import { View, Text, Image, ScrollView } from '@tarojs/components';
import { useRankingStore } from '../../../../stores/ranking-store';
import RankingTab from '../../../../components/RankingTab/index';
import RankBadge from '../../../../components/RankBadge/index';
import LoadingSkeleton from '../../../../components/LoadingSkeleton/index';
import EmptyState from '../../../../components/EmptyState/index';
import ErrorState from '../../../../components/ErrorState/index';
import type { RankingCaseItem } from '../../../../types';

export default function RankingPage() {
  const router = useRouter();
  const initialPeriod = (router.params.period as 'daily' | 'weekly' | 'monthly') || 'weekly';
  const initialType = (router.params.type as 'like_count' | 'view_count' | 'comment_count') || 'like_count';

  const {
    period,
    sortType,
    rankingList,
    loading,
    error,
    hasMore,
    setPeriod,
    setSortType,
    fetchRanking,
    loadMore,
    refresh,
  } = useRankingStore();

  useEffect(() => {
    // setPeriod/setSortType internally call fetchRanking.
    // Only manually fetch if neither setter triggered (both values match defaults).
    const periodChanged = initialPeriod !== period;
    const typeChanged = initialType !== sortType;

    if (periodChanged) setPeriod(initialPeriod);
    if (typeChanged) setSortType(initialType);

    if (!periodChanged && !typeChanged) {
      void fetchRanking({ page: 1 });
    }
  }, []);

  usePullDownRefresh(() => {
    void refresh().finally(() => {
      Taro.stopPullDownRefresh();
    });
  });

  useReachBottom(() => {
    void loadMore();
  });

  const handlePeriodChange = useCallback(
    (newPeriod: 'daily' | 'weekly' | 'monthly') => {
      setPeriod(newPeriod);
    },
    [setPeriod],
  );

  const handleTypeChange = useCallback(
    (newType: 'like_count' | 'view_count' | 'comment_count') => {
      setSortType(newType);
    },
    [setSortType],
  );

  const handleCaseTap = useCallback((caseItem: RankingCaseItem) => {
    Taro.navigateTo({ url: `/pages/cases/detail/index?id=${encodeURIComponent(caseItem.caseId)}` });
  }, []);

  const handleImageError = useCallback(() => {
    // Image fallback placeholder handled via CSS
  }, []);

  const getRankChangeIcon = (change: number | undefined): string => {
    if (change === undefined) return 'NEW';
    if (change > 0) return '↑';
    if (change < 0) return '↓';
    return '=';
  };

  const getRankChangeClass = (change: number | undefined): string => {
    if (change === undefined) return 'new';
    if (change > 0) return 'up';
    if (change < 0) return 'down';
    return 'same';
  };

  const getHotValue = (item: RankingCaseItem): { value: number; label: string } => {
    switch (sortType) {
      case 'view_count': return { value: item.viewCount, label: '浏览' };
      case 'comment_count': return { value: item.commentCount, label: '评论' };
      default: return { value: item.likeCount, label: '点赞' };
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 10000) return `${(num / 10000).toFixed(1)}万`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return String(num);
  };

  return (
    <View className='page-container ranking-page'>
      {/* Tab 切换 */}
      <RankingTab
        activePeriod={period}
        activeType={sortType}
        onPeriodChange={handlePeriodChange}
        onTypeChange={handleTypeChange}
      />

      {/* Loading state */}
      {loading && rankingList.length === 0 && (
        <LoadingSkeleton type='list-item' count={10} />
      )}

      {/* Error state */}
      {error && rankingList.length === 0 && (
        <ErrorState message={error} onRetry={() => { void fetchRanking({ page: 1 }); }} />
      )}

      {/* Empty state */}
      {!loading && !error && rankingList.length === 0 && (
        <EmptyState
          message='当前周期暂无排行数据'
          subMessage='切换其他周期或维度查看'
          icon='🏆'
        />
      )}

      {/* Success state */}
      {rankingList.length > 0 && (
        <ScrollView
          scrollY
          className='ranking-scroll'
          onScrollToLower={() => { void loadMore(); }}
        >
          {rankingList.map((item) => {
            const hot = getHotValue(item);
            return (
              <View
                key={item.caseId}
                className='ranking-item'
                onClick={() => handleCaseTap(item)}
              >
                <RankBadge rank={item.rank} />
                <Image
                  className='ranking-item-cover'
                  src={item.coverUrl || ''}
                  mode='aspectFill'
                  onError={handleImageError}
                />
                <View className='ranking-item-info'>
                  <Text className='ranking-item-title' numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text className='ranking-item-summary' numberOfLines={1}>
                    {item.carModelName} {item.colorSummary}
                  </Text>
                  <View className='ranking-item-stats'>
                    <Text className='ranking-item-hot-current'>
                      ❤️ {formatNumber(hot.value)}
                    </Text>
                    <Text className='ranking-item-hot-other'>
                      👁 {formatNumber(item.viewCount)} 💬 {formatNumber(item.commentCount)}
                    </Text>
                  </View>
                </View>
                <View className='ranking-item-change'>
                  <Text className={`ranking-change-icon ${getRankChangeClass(item.rankChange)}`}>
                    {getRankChangeIcon(item.rankChange)}
                  </Text>
                </View>
              </View>
            );
          })}

          {/* 加载更多 */}
          {hasMore && (
            <View className='ranking-load-more'>
              <Text className='ranking-load-more-text'>加载中...</Text>
            </View>
          )}
          {!hasMore && (
            <View className='ranking-load-end'>
              <Text className='ranking-load-end-text'>已加载全部排行</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
