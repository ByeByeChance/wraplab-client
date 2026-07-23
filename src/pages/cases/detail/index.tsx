import { useEffect, useCallback } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { View, Text, Image, Button, ScrollView } from '@tarojs/components';
import { useCaseStore } from '../../../stores/case-store';
import { useCommentStore } from '../../../stores/comment-store';
import LoadingSkeleton from '../../../components/LoadingSkeleton';
import EmptyState from '../../../components/EmptyState';
import ErrorState from '../../../components/ErrorState';
import RecommendationStrip from '../../../components/recommendation/RecommendationStrip';
import { navigateToComment, navigateToShareCard } from '../../../utils/navigate';

/** 图片轮播当前索引指示器 */
function CarouselDots({
  total,
  current,
}: {
  total: number;
  current: number;
}) {
  if (total <= 1) return null;
  return (
    <View className='carousel-dots'>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          className={`carousel-dot ${i === current ? 'carousel-dot--active' : ''}`}
        />
      ))}
    </View>
  );
}

export default function CaseDetailPage() {
  const router = useRouter();
  const caseId = router.params.id as string;

  const {
    currentCase,
    detailLoading,
    detailError,
    fetchCaseDetail,
    toggleLike,
  } = useCaseStore();

  const {
    comments,
    loading: commentsLoading,
    fetchComments,
  } = useCommentStore();

  /** 加载案例详情 */
  useEffect(() => {
    if (caseId) {
      fetchCaseDetail(caseId).catch(() => {
        // 错误已由 store 捕获并设置 detailError
      });
      void fetchComments(caseId);
    }
  }, [caseId, fetchCaseDetail, fetchComments]);

  /** 处理点赞 */
  const handleLike = useCallback(async () => {
    if (!currentCase) return;
    try {
      await toggleLike(currentCase.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : '操作失败';
      Taro.showToast({ title: message, icon: 'none' });
    }
  }, [currentCase, toggleLike]);

  /** 使用此方案 */
  const handleUseScheme = useCallback(() => {
    if (!currentCase) return;
    const { model } = currentCase.configuration;
    Taro.navigateTo({
      url: `/pages/design/index?modelId=${encodeURIComponent(model.modelName)}&caseId=${encodeURIComponent(currentCase.id)}`,
    });
  }, [currentCase]);

  /** 图片加载失败占位 */
  const handleImageError = useCallback(
    (e: { currentTarget: unknown }) => {
      const target = e.currentTarget as { dataset?: { index?: number } };
      const idx = target?.dataset?.index;
      if (idx !== undefined) {
        // 标记该图片加载失败，切换为占位样式
      }
    },
    [],
  );

  /** 返回上一页 */
  const handleGoBack = useCallback(() => {
    Taro.navigateBack({ delta: 1 });
  }, []);

  /** ---------- 状态渲染 ---------- */

  // Loading
  if (detailLoading) {
    return (
      <View className='page-container'>
        <LoadingSkeleton type='rect' count={8} />
      </View>
    );
  }

  // Error
  if (detailError) {
    return (
      <View className='page-container'>
        <ErrorState
          message={detailError}
          onRetry={() => { if (caseId) fetchCaseDetail(caseId).catch(() => {}); }}
        />
      </View>
    );
  }

  // Empty / not found
  if (!currentCase) {
    return (
      <View className='page-container'>
        <EmptyState
          icon='📋'
          message='案例不存在或已下架'
          actionText='返回上一页'
          onAction={handleGoBack}
        />
      </View>
    );
  }

  // Success
  const { configuration } = currentCase;
  const coverImages = currentCase.images.filter((img) => img.type === 'cover');
  const allImages = coverImages.length > 0 ? coverImages : currentCase.images;
  const isLiked = currentCase.stats.isLiked;
  const likeCount = currentCase.stats.likes;

  return (
    <View className='page-container case-detail-page'>
      <ScrollView className='page-scroll' scrollY>
        {/* 图片轮播区 */}
        <View className='case-detail-carousel'>
          {allImages.length > 0 ? (
            <ScrollView className='carousel-track' scrollX>
              {allImages.map((img, idx) => (
                <View key={idx} className='carousel-item'>
                  <Image
                    className='carousel-image'
                    src={img.url}
                    mode='aspectFill'
                    onError={handleImageError}
                    data-index={idx}
                  />
                </View>
              ))}
            </ScrollView>
          ) : (
            <View className='carousel-placeholder'>
              <Text className='carousel-placeholder-text'>暂无案例图片</Text>
            </View>
          )}
          <CarouselDots total={allImages.length} current={0} />
        </View>

        {/* 案例信息 */}
        <View className='case-detail-body'>
          {/* 标题 */}
          <Text className='case-detail-title'>{currentCase.title}</Text>

          {/* 车型信息: 品牌 > 车系 > 型号 */}
          <View className='case-detail-car-info'>
            <Text className='case-detail-car-text'>
              {configuration.model.brandName}
              {configuration.model.seriesName ? ` > ${configuration.model.seriesName}` : ''}
              {' > '}
              {configuration.model.modelName}
            </Text>
            <Text className='case-detail-car-year'>
              {configuration.model.year}款
            </Text>
          </View>

          {/* 颜色方案 */}
          <View className='case-detail-section'>
            <Text className='case-detail-section-title'>颜色方案</Text>
            <View className='case-detail-swatch-row'>
              {/* 全局改色模式显示整体色块 */}
              {configuration.mode === 'FULL' && (
                <View className='case-detail-swatch-item'>
                  <View
                    className='case-detail-swatch-block'
                    style={{ backgroundColor: configuration.swatch.hex }}
                  />
                  <Text className='case-detail-swatch-name'>
                    {configuration.swatch.name}
                  </Text>
                  <Text className='case-detail-swatch-brand'>
                    {configuration.swatch.brandName}
                  </Text>
                </View>
              )}

              {/* 分部件模式显示每个部件颜色 */}
              {configuration.mode === 'PART' &&
                configuration.parts.map((part) => (
                  <View key={part.partCode} className='case-detail-swatch-item'>
                    <View
                      className='case-detail-swatch-block'
                      style={{ backgroundColor: part.hex }}
                    />
                    <Text className='case-detail-swatch-name'>
                      {part.swatchName}
                    </Text>
                    <Text className='case-detail-swatch-part-code'>
                      {part.partCode}
                    </Text>
                  </View>
                ))}
            </View>

            {/* 材质 */}
            <View className='case-detail-material'>
              <Text className='case-detail-material-label'>材质：</Text>
              <Text className='case-detail-material-value'>
                {configuration.material.name}
              </Text>
            </View>
          </View>

          {/* 价格信息 */}
          <View className='case-detail-section'>
            <Text className='case-detail-section-title'>参考价格</Text>
            <View className='case-detail-price-list'>
              <View className='case-detail-price-item'>
                <Text className='case-detail-price-label'>材料费</Text>
                <Text className='case-detail-price-value'>
                  ¥{currentCase.price.materialPrice.toLocaleString()}
                </Text>
              </View>
              <View className='case-detail-price-item'>
                <Text className='case-detail-price-label'>工时费</Text>
                <Text className='case-detail-price-value'>
                  ¥{currentCase.price.laborPrice.toLocaleString()}
                </Text>
              </View>
              <View className='case-detail-price-item case-detail-price-item--total'>
                <Text className='case-detail-price-label'>合计</Text>
                <Text className='case-detail-price-value case-detail-price-value--total'>
                  ¥{currentCase.price.totalPrice.toLocaleString()}
                </Text>
              </View>
            </View>
          </View>

          {/* 案例描述 */}
          {currentCase.description && (
            <View className='case-detail-section'>
              <Text className='case-detail-section-title'>案例描述</Text>
              <Text className='case-detail-description'>
                {currentCase.description}
              </Text>
            </View>
          )}

          {/* 门店信息 */}
          <View className='case-detail-section'>
            <Text className='case-detail-section-title'>施工门店</Text>
            <View className='case-detail-store'>
              {currentCase.store.logo ? (
                <Image
                  className='case-detail-store-logo'
                  src={currentCase.store.logo}
                  mode='aspectFill'
                />
              ) : (
                <View className='case-detail-store-logo-placeholder'>
                  <Text className='case-detail-store-logo-placeholder-text'>店</Text>
                </View>
              )}
              <View className='case-detail-store-info'>
                <Text className='case-detail-store-name'>
                  {currentCase.store.name}
                </Text>
                <Text className='case-detail-store-address'>
                  {currentCase.store.address}
                </Text>
                <Text className='case-detail-store-rating'>
                  评分：{currentCase.store.rating.toFixed(1)}
                </Text>
              </View>
            </View>
          </View>

          {/* Phase 5: 案例智能推荐 (评论区上方) */}
          {currentCase && (
            <RecommendationStrip
              caseId={currentCase.id}
              onCardClick={(cId) => {
                Taro.navigateTo({ url: `/pages/cases/detail/index?id=${encodeURIComponent(cId)}` });
              }}
            />
          )}

          {/* Phase 4: 评论摘要区 */}
          <View className='case-detail-comments-section'>
            <View className='case-detail-comments-header'>
              <Text className='case-detail-comments-title'>
                评论 ({comments.length > 0 ? comments.length : 0})
              </Text>
            </View>
            {commentsLoading && comments.length === 0 ? (
              <LoadingSkeleton type='list-item' count={2} />
            ) : comments.length > 0 ? (
              <>
                {comments.slice(0, 3).map((comment) => (
                  <View key={comment.id} className='case-detail-comment-preview'>
                    <Text className='case-detail-comment-author'>
                      {comment.authorName}
                      {comment.replyToUserName && (
                        <Text className='case-detail-comment-reply-to'>
                          {' '}回复 @{comment.replyToUserName}：
                        </Text>
                      )}
                      {!comment.replyToUserName && '：'}
                    </Text>
                    <Text className='case-detail-comment-content' numberOfLines={2}>
                      {comment.content}
                    </Text>
                  </View>
                ))}
                <View
                  className='case-detail-comments-more'
                  onClick={() => navigateToComment(caseId)}
                >
                  <Text className='case-detail-comments-more-text'>
                    查看全部 {comments.length} 条评论
                  </Text>
                </View>
              </>
            ) : (
              <View className='case-detail-comments-empty'>
                <Text className='case-detail-comments-empty-text'>
                  暂无评论，来发表第一条评论吧
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* 底部操作栏 */}
      <View className='case-detail-footer'>
        <Button
          className={`case-detail-like-btn ${isLiked ? 'case-detail-like-btn--liked' : ''}`}
          onClick={handleLike}
        >
          <Text className='case-detail-like-icon'>
            {isLiked ? '♥' : '♡'}
          </Text>
          <Text className='case-detail-like-count'>{likeCount}</Text>
        </Button>
        <Button
          className='case-detail-share-btn'
          onClick={() => navigateToShareCard(caseId)}
        >
          分享
        </Button>
        <Button
          className='case-detail-use-btn'
          onClick={handleUseScheme}
        >
          使用此方案
        </Button>
      </View>
    </View>
  );
}
