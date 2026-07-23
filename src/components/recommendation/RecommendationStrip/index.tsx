import { useState, useEffect, useCallback } from 'react';
import { View, Text, Image, ScrollView } from '@tarojs/components';
import { recommendationService } from '../../../services';
import { useAuthStore } from '../../../stores/auth-store';
import type { RecommendCase, RecommendationStripProps } from '../../../types';
import './index.less';

export default function RecommendationStrip({ caseId, onCardClick }: RecommendationStripProps) {
  const [recommendations, setRecommendations] = useState<RecommendCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const activeStoreId = useAuthStore((s) => s.activeStoreId);

  const fetchRecommendations = useCallback(async () => {
    if (!caseId) return;
    setLoading(true);
    setError(false);
    try {
      const params: { limit?: number; store_id?: string } = { limit: 6 };
      if (activeStoreId) {
        params.store_id = activeStoreId;
      }
      const data = await recommendationService.getRecommendations(caseId, params);
      setRecommendations(data);
      setLoading(false);
    } catch {
      setError(true);
      setLoading(false);
    }
  }, [caseId, activeStoreId]);

  useEffect(() => {
    void fetchRecommendations();
  }, [fetchRecommendations]);

  // Empty - don't render
  if (!loading && !error && recommendations.length === 0) {
    return null;
  }

  // Error state with retry
  if (error) {
    return (
      <View className='recommendation-strip'>
        <View className='recommendation-strip-title'>你可能也喜欢</View>
        <View className='recommendation-strip-error'>
          <Text className='recommendation-strip-error-text'>加载失败，轻触重试</Text>
          <View className='recommendation-strip-retry-btn' onClick={() => void fetchRecommendations()}>
            <Text className='recommendation-strip-retry-text'>重试</Text>
          </View>
        </View>
      </View>
    );
  }

  // Loading
  if (loading) {
    return (
      <View className='recommendation-strip'>
        <View className='recommendation-strip-title'>你可能也喜欢</View>
        <ScrollView className='recommendation-strip-scroll' scrollX showScrollbar={false}>
          <View className='recommendation-strip-inner'>
            {Array.from({ length: 3 }).map((_, idx) => (
              <View key={idx} className='recommend-card-skeleton'>
                <View className='recommend-card-skeleton-img' />
                <View className='recommend-card-skeleton-line-1' />
                <View className='recommend-card-skeleton-line-2' />
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // Success
  const isFewCards = recommendations.length < 3;

  return (
    <View className='recommendation-strip'>
      <View className='recommendation-strip-title'>你可能也喜欢</View>
      <ScrollView className='recommendation-strip-scroll' scrollX={!isFewCards} showScrollbar={false}>
        <View
          className={`recommendation-strip-inner ${
            isFewCards ? 'recommendation-strip-inner--centered' : ''
          }`}
        >
          {recommendations.map((item) => (
            <View
              key={item.caseId}
              className='recommend-card'
              onClick={() => onCardClick(item.caseId)}
            >
              {item.coverUrl ? (
                <Image
                  className='recommend-card-cover'
                  src={item.coverUrl}
                  mode='aspectFill'
                />
              ) : (
                <View className='recommend-card-cover-placeholder' />
              )}
              <Text className='recommend-card-title' numberOfLines={1}>
                {item.title}
              </Text>
              <Text className='recommend-card-summary' numberOfLines={1}>
                {item.carModelName} / {item.colorSummary}
              </Text>
              <View className='recommend-card-likes'>
                <Text className='recommend-card-like-icon'>♥</Text>
                <Text className='recommend-card-like-count'>{item.likeCount}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
