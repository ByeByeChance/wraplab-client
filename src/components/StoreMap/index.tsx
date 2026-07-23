import { View, Text, Map } from '@tarojs/components';
import Taro from '@tarojs/taro';
import type { NearbyStore } from '../../types/phase3';

interface StoreMapProps {
  stores: NearbyStore[];
  loading?: boolean;
  error?: boolean;
  latitude: number;
  longitude: number;
  locationAuthorized: boolean;
  onMarkerTap?: (store: NearbyStore) => void;
  onRegionChange?: (e: { type: string }) => void;
  onRetry?: () => void;
  onExpandSearch?: () => void;
  onMapReady?: () => void;
}

const StoreMap: React.FC<StoreMapProps> = ({
  stores,
  loading,
  error,
  latitude,
  longitude,
  locationAuthorized,
  onMarkerTap,
  onRegionChange,
  onRetry,
  onExpandSearch,
  onMapReady,
}) => {
  const markers = stores.map((store) => ({
    id: Number(store.id.replace(/\D/g, '').slice(0, 9)) || Math.floor(Math.random() * 100000),
    latitude: store.lat,
    longitude: store.lng,
    title: store.name,
    iconPath: '',
    width: 32,
    height: 40,
    callout: {
      content: `${(store.distanceMeters / 1000).toFixed(1)}km`,
      color: '#8C8C8C',
      fontSize: 10,
      borderRadius: 8,
      bgColor: '#FFFFFF',
      padding: 4,
      display: 'ALWAYS' as const,
      anchorX: 0,
      anchorY: 0,
      borderWidth: 0,
      borderColor: '#FFFFFF',
      textAlign: 'center' as const,
    },
  }));

  const handleRegionChange = (e: { type: string; detail?: { type: string } }) => {
    onRegionChange?.(e);
  };

  return (
    <View className='store-map-container'>
      {/* Location permission tip */}
      {!locationAuthorized && (
        <View className='store-map-permission-tip'>
          <Text className='store-map-permission-text'>
            无法获取您的位置
          </Text>
          <View
            className='store-map-permission-btn'
            onClick={() => {
              Taro.openSetting();
            }}
          >
            <Text className='store-map-permission-btn-text'>
              去开启
            </Text>
          </View>
        </View>
      )}

      {/* Map area */}
      <View className='store-map-area'>
        <Map
          id='store-map'
          className='store-map-view'
          latitude={latitude}
          longitude={longitude}
          scale={14}
          markers={markers}
          showLocation
          onError={() => {}}
          onRegionChange={handleRegionChange}
          onMarkerTap={(e) => {
            const markerId = e.detail?.markerId;
            const store = stores.find(
              (s) => Number(s.id.replace(/\D/g, '').slice(0, 9)) === Number(markerId),
            );
            if (store) {
              onMarkerTap?.(store);
            }
          }}
          onUpdated={onMapReady}
        />

        {/* Loading overlay */}
        {loading && (
          <View className='store-map-loading-overlay'>
            <View className='store-map-loading-skeleton'>
              <View className='store-map-loading-bar' />
              <View className='store-map-loading-bar store-map-loading-bar-short' />
              <View className='store-map-loading-bar store-map-loading-bar-medium' />
            </View>
          </View>
        )}

        {/* Empty overlay */}
        {stores.length === 0 && !loading && !error && (
          <View className='store-map-empty-overlay'>
            <Text className='store-map-empty-icon'>📍</Text>
            <Text className='store-map-empty-text'>
              当前区域暂无合作门店
            </Text>
            {onExpandSearch && (
              <View
                className='store-map-expand-btn'
                onClick={onExpandSearch}
              >
                <Text className='store-map-expand-btn-text'>
                  扩大搜索范围
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Error toast */}
        {error && (
          <View className='store-map-error-toast'>
            <Text className='store-map-error-text'>
              门店数据加载失败
            </Text>
            {onRetry && (
              <View className='store-map-retry-btn' onClick={onRetry}>
                <Text className='store-map-retry-btn-text'>
                  点击重试
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

export default StoreMap;
