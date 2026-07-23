import { useState, useCallback, useEffect } from 'react';
import { View, Text, Image, Swiper, SwiperItem } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { useStoreStore } from '../../../stores';
import StatusBadge from '../../../components/StatusBadge';
import type { StoreDetail } from '../../../types/phase3';
import './index.less';

const StoreDetailPage: React.FC = () => {
  const {
    storeDetailMap,
    fetchStoreDetail,
  } = useStoreStore();

  const [storeId, setStoreId] = useState<string>('');
  const [detail, setDetail] = useState<StoreDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useLoad((options) => {
    const id = options?.id || '';
    setStoreId(id);
    if (id) {
      loadDetail(id);
    }
  });

  const loadDetail = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStoreDetail(id);
      setDetail(data);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      const message = err instanceof Error ? err.message : '门店信息加载失败';
      setError(message);
    }
  };

  // Also check cache on mount
  useEffect(() => {
    if (storeId) {
      const cached = storeDetailMap[storeId];
      if (cached) {
        setDetail(cached.data);
        setLoading(false);
      }
    }
  }, [storeId, storeDetailMap]);

  const handlePreviewImage = useCallback(
    (index: number) => {
      if (detail?.photos && detail.photos.length > 0) {
        Taro.previewImage({
          urls: detail.photos,
          current: detail.photos[index],
        });
      }
    },
    [detail],
  );

  const formatDistance = (meters: number): string => {
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  // Loading state
  if (loading) {
    return (
      <View className='store-detail-page'>
        <View className='loading-skeleton-image' />
        <View className='section' style={{ padding: '32rpx' }}>
          {[60, 40, 80, 50, 50, 50].map((width, i) => (
            <View
              key={i}
              className='loading-skeleton-line'
              style={{ width: `${width}%` }}
            />
          ))}
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View className='store-detail-page'>
        <View
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '120rpx 32rpx',
          }}
        >
          <Text style={{ fontSize: '80rpx', color: '#FF4D4F', marginBottom: '24rpx' }}>
            ⚠
          </Text>
          <Text style={{ fontSize: '28rpx', color: '#595959', marginBottom: '8rpx' }}>
            门店信息加载失败
          </Text>
          <Text style={{ fontSize: '24rpx', color: '#8C8C8C', marginBottom: '32rpx' }}>
            请检查网络后重试
          </Text>
          <View
            onClick={() => loadDetail(storeId)}
            style={{
              padding: '12rpx 48rpx',
              border: '1px solid #0F3460',
              borderRadius: '8rpx',
            }}
          >
            <Text style={{ fontSize: '26rpx', color: '#0F3460' }}>点击重试</Text>
          </View>
        </View>
      </View>
    );
  }

  // Empty state (404)
  if (!detail) {
    return (
      <View className='store-detail-page'>
        <View
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '120rpx 32rpx',
          }}
        >
          <Text style={{ fontSize: '80rpx', color: '#D9D9D9', marginBottom: '24rpx' }}>
            🏪
          </Text>
          <Text style={{ fontSize: '28rpx', color: '#595959', marginBottom: '32rpx' }}>
            门店不存在或已下线
          </Text>
          <View
            onClick={() => Taro.navigateBack()}
            style={{
              padding: '12rpx 48rpx',
              border: '1px solid #0F3460',
              borderRadius: '8rpx',
            }}
          >
            <Text style={{ fontSize: '26rpx', color: '#0F3460' }}>返回门店列表</Text>
          </View>
        </View>
      </View>
    );
  }

  // Success state
  const hasPhotos = detail.photos && detail.photos.length > 0;

  return (
    <View className='store-detail-page'>
      {/* Image Swiper */}
      {hasPhotos ? (
        <Swiper
          className='detail-swiper'
          indicatorDots={detail.photos.length > 1}
          autoplay={detail.photos.length > 1}
          interval={5000}
          circular={detail.photos.length > 1}
          indicatorColor='#D9D9D9'
          indicatorActiveColor='#0F3460'
        >
          {detail.photos.map((photo, index) => (
            <SwiperItem key={index}>
              <Image
                src={photo}
                mode='aspectFill'
                className='swiper-image'
                onClick={() => handlePreviewImage(index)}
              />
            </SwiperItem>
          ))}
        </Swiper>
      ) : (
        <View className='swiper-placeholder'>
          <Text style={{ fontSize: '64rpx', color: '#D9D9D9' }}>🏪</Text>
        </View>
      )}

      {/* Store Info */}
      <View className='section info-section'>
        {detail.logo && (
          <Image src={detail.logo} mode='aspectFill' className='store-logo' />
        )}
        <View className='info-content'>
          <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
            <Text className='store-name' style={{ flex: 1 }}>{detail.name}</Text>
            {detail.rating !== undefined && detail.rating >= 4.5 && (
              <StatusBadge status='pending' label='推荐' size='small' />
            )}
          </View>
          <View className='rating-row'>
            <Text className='rating-star'>★</Text>
            <Text className='rating-score'>
              {detail.rating !== undefined ? detail.rating.toFixed(1) : '暂无'}
            </Text>
          </View>
          <Text className='distance-text'>
            {formatDistance(detail.distanceMeters)}
          </Text>
          <Text className='address-text'>{detail.address}</Text>
        </View>
      </View>

      {/* Business Hours */}
      {detail.businessHours && (
        <View className='section'>
          <Text className='section-title'>营业时间</Text>
          <Text className='business-hours'>{detail.businessHours}</Text>
        </View>
      )}

      {/* Services */}
      {detail.services && detail.services.length > 0 && (
        <View className='section'>
          <Text className='section-title'>服务项目</Text>
          <View className='service-tags'>
            {detail.services.map((service) => (
              <Text key={service} className='service-tag'>{service}</Text>
            ))}
          </View>
        </View>
      )}

      {/* Description */}
      {detail.description && (
        <View className='section'>
          <Text className='section-title'>门店简介</Text>
          <Text
            className='description-text'
            numberOfLines={expanded ? undefined : 3}
          >
            {detail.description}
          </Text>
          {detail.description.length > 150 && (
            <Text
              className='expand-button'
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? '收起' : '展开全部'}
            </Text>
          )}
        </View>
      )}

      {/* Phone */}
      {detail.phone && (
        <View
          className='section phone-section'
          onClick={() => {
            Taro.makePhoneCall({ phoneNumber: detail.phone });
          }}
        >
          <View>
            <Text className='section-title'>联系电话</Text>
            <Text className='phone-number'>{detail.phone}</Text>
          </View>
          <Text className='phone-hint'>点击拨打 &gt;</Text>
        </View>
      )}

      {/* Bottom Action Bar */}
      <View className='bottom-action-bar'>
        <View
          className='action-btn'
          onClick={() => {
            Taro.openLocation({
              latitude: detail.lat,
              longitude: detail.lng,
              name: detail.name,
              address: detail.address,
            });
          }}
        >
          <Text style={{ fontSize: '24rpx', color: '#595959' }}>一键导航</Text>
        </View>
        <View
          className='action-btn'
          onClick={() => {
            Taro.makePhoneCall({ phoneNumber: detail.phone });
          }}
        >
          <Text style={{ fontSize: '24rpx', color: '#595959' }}>拨打电话</Text>
        </View>
        <View
          className='action-btn-primary'
          onClick={() => {
            Taro.navigateTo({
              url: `/pages/appointment/create/index?storeId=${detail.id}`,
            });
          }}
        >
          <Text style={{ fontSize: '26rpx', color: '#FFFFFF', fontWeight: 700 }}>
            在线预约
          </Text>
        </View>
      </View>
    </View>
  );
};

export default StoreDetailPage;
