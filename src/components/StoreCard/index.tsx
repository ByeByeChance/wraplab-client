import { View, Text, Image } from '@tarojs/components';
import type { NearbyStore } from '../../types/phase3';

interface StoreCardProps {
  store: NearbyStore;
  mode: 'brief' | 'list-item' | 'detail-summary';
  rank?: number;
  showFullAddress?: boolean;
  showActions?: boolean;
  onViewDetail?: (storeId: string) => void;
  onNavigate?: (store: NearbyStore) => void;
  onBook?: (storeId: string) => void;
  selected?: boolean;
  onTap?: (store: NearbyStore) => void;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function renderStars(rating: number | undefined): string {
  if (!rating) return '暂无评分';
  return `★ ${rating.toFixed(1)}`;
}

const StoreCard: React.FC<StoreCardProps> = ({
  store,
  mode,
  rank,
  showFullAddress,
  showActions,
  onViewDetail,
  onNavigate,
  onBook,
  selected,
  onTap,
}) => {
  const distance = formatDistance(store.distanceMeters);

  const handleTap = () => {
    if (onTap) {
      onTap(store);
    } else if (mode !== 'brief') {
      onViewDetail?.(store.id);
    }
  };

  if (mode === 'brief') {
    return (
      <View
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16rpx 16rpx 0 0',
          boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
          overflow: 'hidden',
        }}
      >
        {store.coverImage && (
          <Image
            src={store.coverImage}
            mode='aspectFill'
            style={{ width: '100%', height: '200rpx' }}
          />
        )}
        <View style={{ padding: '20rpx 24rpx' }}>
          <Text
            style={{
              fontSize: '28rpx',
              fontWeight: 700,
              color: '#1A1A2E',
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {store.name}
          </Text>
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: '8rpx',
            }}
          >
            <Text style={{ fontSize: '24rpx', color: '#FAAD14' }}>
              {renderStars(store.rating)}
            </Text>
            <Text style={{ fontSize: '24rpx', color: '#BFBFBF', marginLeft: '16rpx' }}>
              {distance}
            </Text>
          </View>
          <Text
            style={{
              fontSize: '24rpx',
              color: '#8C8C8C',
              marginTop: '8rpx',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '30em',
            }}
          >
            {store.address}
          </Text>
          {showActions && (
            <View
              style={{
                display: 'flex',
                flexDirection: 'row',
                gap: '12rpx',
                marginTop: '16rpx',
              }}
            >
              <View
                onClick={() => onViewDetail?.(store.id)}
                style={{
                  flex: 1,
                  height: '72rpx',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#F5F5F5',
                  borderRadius: '8rpx',
                  border: '1px solid #E8E8E8',
                }}
              >
                <Text style={{ fontSize: '24rpx', color: '#595959' }}>
                  查看详情
                </Text>
              </View>
              <View
                onClick={() => onNavigate?.(store)}
                style={{
                  flex: 1,
                  height: '72rpx',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#F5F5F5',
                  borderRadius: '8rpx',
                  border: '1px solid #E8E8E8',
                }}
              >
                <Text style={{ fontSize: '24rpx', color: '#595959' }}>
                  一键导航
                </Text>
              </View>
              <View
                onClick={() => onBook?.(store.id)}
                style={{
                  flex: 1,
                  height: '72rpx',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #1A1A2E, #0F3460)',
                  borderRadius: '8rpx',
                }}
              >
                <Text style={{ fontSize: '24rpx', color: '#FFFFFF' }}>
                  在线预约
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  }

  if (mode === 'list-item') {
    return (
      <View
        onClick={handleTap}
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          height: '100rpx',
          padding: '16rpx 32rpx',
          backgroundColor: selected ? '#F0F5FF' : '#FFFFFF',
          border: selected ? '2rpx solid #0F3460' : '1px solid transparent',
          borderRadius: selected ? '12rpx' : '0',
        }}
      >
        {rank !== undefined && (
          <View
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: '#F5F5F5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '16rpx',
              flexShrink: 0,
            }}
          >
            <Text style={{ fontSize: '22rpx', fontWeight: 700, color: '#8C8C8C' }}>
              {rank}
            </Text>
          </View>
        )}
        {store.logo && (
          <Image
            src={store.logo}
            mode='aspectFill'
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '8rpx',
              marginRight: '16rpx',
              flexShrink: 0,
            }}
          />
        )}
        <View style={{ flex: 1, overflow: 'hidden' }}>
          <Text
            style={{
              fontSize: '28rpx',
              fontWeight: 500,
              color: '#1A1A2E',
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {store.name}
          </Text>
          <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: '24rpx', color: '#FAAD14' }}>
              {renderStars(store.rating)}
            </Text>
            <Text style={{ fontSize: '24rpx', color: '#BFBFBF', marginLeft: '12rpx' }}>
              {distance}
            </Text>
          </View>
          {showFullAddress && (
            <Text
              style={{
                fontSize: '24rpx',
                color: '#8C8C8C',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '20em',
              }}
            >
              {store.address}
            </Text>
          )}
        </View>
        {selected && (
          <Text style={{ fontSize: '32rpx', color: '#0F3460', flexShrink: 0 }}>
            ✓
          </Text>
        )}
      </View>
    );
  }

  // detail-summary mode
  return (
    <View
      onClick={handleTap}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: '24rpx 32rpx',
        backgroundColor: selected ? '#F0F5FF' : '#FFFFFF',
        border: selected ? '2rpx solid #0F3460' : '1px solid #E8E8E8',
        borderRadius: '12rpx',
      }}
    >
      {store.logo && (
        <Image
          src={store.logo}
          mode='aspectFill'
          style={{
            width: '96px',
            height: '96px',
            borderRadius: '12rpx',
            marginRight: '20rpx',
            flexShrink: 0,
          }}
        />
      )}
      <View style={{ flex: 1 }}>
        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <Text
            style={{
              fontSize: '28rpx',
              fontWeight: 700,
              color: '#1A1A2E',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}
          >
            {store.name}
          </Text>
          {store.rating && store.rating >= 4.5 && (
            <View
              style={{
                padding: '2px 12px',
                borderRadius: '6px',
                backgroundColor: '#FFF7E6',
                marginLeft: '12rpx',
              }}
            >
              <Text style={{ fontSize: '22rpx', color: '#FA8C16', fontWeight: 500 }}>
                推荐
              </Text>
            </View>
          )}
        </View>
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: '8rpx',
          }}
        >
          <Text style={{ fontSize: '24rpx', color: '#FAAD14' }}>
            {renderStars(store.rating)}
          </Text>
          <Text style={{ fontSize: '22rpx', color: '#BFBFBF', marginLeft: '12rpx' }}>
            {distance}
          </Text>
        </View>
        <Text
          style={{
            fontSize: '26rpx',
            color: '#595959',
            marginTop: '8rpx',
            lineHeight: 1.4,
          }}
        >
          {store.address}
        </Text>
      </View>
      {selected && (
        <Text style={{ fontSize: '32rpx', color: '#0F3460', flexShrink: 0 }}>
          ✓
        </Text>
      )}
    </View>
  );
};

export default StoreCard;
