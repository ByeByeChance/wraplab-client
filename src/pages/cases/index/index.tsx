import { useState, useEffect, useCallback, useRef } from 'react';
import Taro, { usePullDownRefresh, useReachBottom } from '@tarojs/taro';
import { View, Text, Image, ScrollView } from '@tarojs/components';
import LoadingSkeleton from '../../../components/LoadingSkeleton';
import EmptyState from '../../../components/EmptyState';
import ErrorState from '../../../components/ErrorState';
import TagFilterBar from '../../../components/tag/TagFilterBar';
import { useAuthStore } from '../../../stores/auth-store';
import { tagService } from '../../../services';
import { navigateToRanking } from '../../../utils/navigate';
import type { Tag } from '../../../types';
import './index.less';

type CasesTab = 'recommend' | 'ranking';

interface CaseItem {
  id: string;
  imageUrl: string;
  brandName: string;
  seriesName: string;
  modelName: string;
  colorName: string;
  colorHex: string;
  materialName: string;
  likes: number;
}

/** Mock 案例数据 */
const MOCK_CASES: CaseItem[] = [
  { id: '1', imageUrl: '', brandName: '宝马', seriesName: '3系', modelName: '330i', colorName: 'AX 哑光磨砂灰', colorHex: '#636363', materialName: '哑光', likes: 128 },
  { id: '2', imageUrl: '', brandName: '特斯拉', seriesName: '', modelName: 'Model Y', colorName: '液态金属银', colorHex: '#C0C0C0', materialName: '亮面', likes: 256 },
  { id: '3', imageUrl: '', brandName: '保时捷', seriesName: '718', modelName: '718', colorName: '迈阿密蓝', colorHex: '#0077B6', materialName: '亮面', likes: 89 },
  { id: '4', imageUrl: '', brandName: '奔驰', seriesName: 'C级', modelName: 'C260L', colorName: '3M 陶瓷白', colorHex: '#FFFFFF', materialName: '磨砂', likes: 312 },
  { id: '5', imageUrl: '', brandName: '奥迪', seriesName: 'A4L', modelName: 'A4L 45TFSI', colorName: 'HEXIS 战斗灰', colorHex: '#4A4A4A', materialName: '哑光', likes: 76 },
  { id: '6', imageUrl: '', brandName: '理想', seriesName: 'L9', modelName: 'L9 Max', colorName: 'KPMF 金属紫', colorHex: '#6C63FF', materialName: '亮面', likes: 195 },
];

export default function CasesPage() {
  const [activeTab, setActiveTab] = useState<CasesTab>('recommend');
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadMoreError, setLoadMoreError] = useState(false);

  // Phase 5: Tag filter state
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tagsLoading, setTagsLoading] = useState<boolean>(true);
  const [tagsError, setTagsError] = useState<boolean>(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeStoreId = useAuthStore((s) => s.activeStoreId);

  const fetchCases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setCases(MOCK_CASES.slice(0, 4));
      setHasMore(MOCK_CASES.length > 4);
      setLoading(false);
    } catch {
      setError('案例加载失败');
      setLoading(false);
    }
  }, []);

  // Phase 5: Fetch tags
  const fetchTags = useCallback(async () => {
    if (!activeStoreId) return;
    setTagsLoading(true);
    setTagsError(false);
    try {
      const data = await tagService.getTags(activeStoreId);
      setTags(data);
      setTagsLoading(false);
    } catch {
      setTagsError(true);
      setTagsLoading(false);
    }
  }, [activeStoreId]);

  useEffect(() => {
    fetchCases();
    fetchTags();
  }, [fetchCases, fetchTags]);

  usePullDownRefresh(() => {
    fetchCases().finally(() => {
      Taro.stopPullDownRefresh();
    });
  });

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setLoadMoreError(false);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setCases((prev) => [...prev, ...MOCK_CASES.slice(prev.length, prev.length + 4)]);
      setHasMore(cases.length + 4 < MOCK_CASES.length);
      setLoadingMore(false);
    } catch {
      setLoadMoreError(true);
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, cases.length]);

  useReachBottom(() => {
    loadMore();
  });

  const handleCaseTap = useCallback((item: CaseItem) => {
    Taro.navigateTo({ url: `/pages/cases/detail/index?caseId=${encodeURIComponent(item.id)}` });
  }, []);

  const handleImageError = useCallback((_e: { currentTarget: unknown }) => {
    // noop
  }, []);

  const handleTabChange = useCallback((tab: CasesTab) => {
    if (tab === 'ranking') {
      navigateToRanking();
      return;
    }
    setActiveTab(tab);
  }, []);

  // Phase 5: Tag filter handlers
  const handleTagToggle = useCallback((tagId: string) => {
    setSelectedTagIds((prev) => {
      if (prev.includes(tagId)) {
        return prev.filter((id) => id !== tagId);
      }
      return [...prev, tagId];
    });
    // Debounced case refresh
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      fetchCases();
    }, 200);
  }, [fetchCases]);

  const handleTagReset = useCallback(() => {
    setSelectedTagIds([]);
    fetchCases();
  }, [fetchCases]);

  // Loading
  if (loading) {
    return (
      <View className='page-container'>
        <View className='page-scroll'>
          <View className='cases-grid'>
            <LoadingSkeleton type='case-card' count={6} />
          </View>
        </View>
      </View>
    );
  }

  // Error
  if (error) {
    return (
      <View className='page-container'>
        <ErrorState message={error} onRetry={fetchCases} />
      </View>
    );
  }

  // Empty
  if (cases.length === 0) {
    return (
      <View className='page-container'>
        <EmptyState message='暂无完工案例' subMessage='敬请期待更多精彩案例上线' />
      </View>
    );
  }

  // Success
  return (
    <View className='page-container'>
      {/* Tab bar */}
      <View className='cases-tab-row'>
        <View
          className={`cases-tab-item ${activeTab === 'recommend' ? 'active' : ''}`}
          onClick={() => handleTabChange('recommend')}
          style={{ minWidth: '88rpx', minHeight: '44px' }}
        >
          <Text className='cases-tab-text'>推荐</Text>
        </View>
        <View
          className={`cases-tab-item ${activeTab === 'ranking' ? 'active' : ''}`}
          onClick={() => handleTabChange('ranking')}
          style={{ minWidth: '88rpx', minHeight: '44px' }}
        >
          <Text className='cases-tab-text'>排行榜</Text>
        </View>
        {activeTab === 'recommend' && <View className='cases-tab-indicator' />}
      </View>

      {/* Phase 5: Tag Filter Bar */}
      <TagFilterBar
        tags={tags}
        selectedTagIds={selectedTagIds}
        onTagToggle={handleTagToggle}
        onReset={handleTagReset}
        loading={tagsLoading}
        error={tagsError}
        onRetry={fetchTags}
      />

      <ScrollView className='page-scroll' onScrollToLower={loadMore}>
        <View className='cases-grid'>
          {cases.map((item) => (
            <View key={item.id} className='case-card' onClick={() => handleCaseTap(item)}>
              <View className='case-card-image-wrap'>
                {item.imageUrl ? (
                  <Image
                    className='case-card-image'
                    src={item.imageUrl}
                    mode='aspectFill'
                    onError={handleImageError}
                  />
                ) : (
                  <View className='case-card-image-placeholder'>
                    <Text className='case-card-image-placeholder-text'>暂无图片</Text>
                  </View>
                )}
              </View>
              <View className='case-card-info'>
                <Text className='case-card-name' numberOfLines={1}>
                  {item.brandName} {item.seriesName} {item.modelName}
                </Text>
                <Text className='case-card-color' numberOfLines={1}>
                  {item.colorName}
                </Text>
                <Text className='case-card-likes'>&#9825; {item.likes}</Text>
              </View>
            </View>
          ))}
        </View>

        <View className='cases-load-more'>
          {loadingMore && <Text className='cases-load-more-text'>加载中...</Text>}
          {loadMoreError && (
            <Text className='cases-load-more-error' onClick={loadMore}>
              加载失败，点击重试
            </Text>
          )}
          {!hasMore && cases.length > 0 && (
            <Text className='cases-load-more-end'>—— 没有更多了 ——</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
