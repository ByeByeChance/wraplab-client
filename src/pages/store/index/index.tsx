import { useState, useCallback, useRef } from 'react';
import { View } from '@tarojs/components';
import Taro, { useLoad, useDidShow, useUnload } from '@tarojs/taro';
import { useStoreStore } from '../../../stores';
import StoreMap from '../../../components/StoreMap';
import StoreCard from '../../../components/StoreCard';
import type { NearbyStore } from '../../../types/phase3';
import './index.less';

const StoreIndex: React.FC = () => {
  const {
    userLocation,
    locationAuthorized,
    nearbyStores,
    nearbyStoresLoading,
    nearbyStoresError,
    searchRadius,
    selectedStore,
    requestLocation,
    fetchNearbyStores,
    selectStore,
    expandSearchRadius,
  } = useStoreStore();

  const [drawerExpanded, setDrawerExpanded] = useState(false);
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
  const regionChangeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCenter = useRef<{ lat: number; lng: number } | null>(null);
  const mapCtxRef = useRef<Taro.MapContext | null>(null);

  useLoad(() => {
    requestLocation().then(() => {
      const loc = useStoreStore.getState().userLocation;
      if (loc) {
        fetchNearbyStores({ lat: loc.latitude, lng: loc.longitude });
      }
    });
  });

  useDidShow(() => {
    const loc = useStoreStore.getState().userLocation;
    if (loc) {
      fetchNearbyStores({ lat: loc.latitude, lng: loc.longitude });
    }
  });

  useUnload(() => {
    if (regionChangeTimer.current) {
      clearTimeout(regionChangeTimer.current);
    }
  });

  const handleMapReady = useCallback(() => {
    mapCtxRef.current = Taro.createMapContext('store-map');
  }, []);

  const handleMarkerTap = useCallback(
    (store: NearbyStore) => {
      // 300ms debounce
      if (activeMarkerId === store.id) {
        selectStore(null);
        setActiveMarkerId(null);
        return;
      }
      selectStore(store);
      setActiveMarkerId(store.id);
    },
    [activeMarkerId, selectStore],
  );

  const handleRegionChange = useCallback(
    (e: { type: string }) => {
      // Only act on region change end events
      if (e.type !== 'end') return;

      if (regionChangeTimer.current) {
        clearTimeout(regionChangeTimer.current);
      }
      regionChangeTimer.current = setTimeout(async () => {
        try {
          const mapCtx = mapCtxRef.current;
          if (!mapCtx) return;

          const center = await new Promise<{ latitude: number; longitude: number }>(
            (resolve, reject) => {
              mapCtx.getCenterLocation({
                success: resolve,
                fail: reject,
              });
            },
          );

          const newCenter = { lat: center.latitude, lng: center.longitude };
          lastCenter.current = newCenter;

          const loc = useStoreStore.getState().userLocation;
          if (loc) {
            const dlat = Math.abs(loc.latitude - newCenter.lat);
            const dlng = Math.abs(loc.longitude - newCenter.lng);
            const thresholdDeg = (searchRadius / 111320) * 0.5;
            if (dlat > thresholdDeg || dlng > thresholdDeg) {
              fetchNearbyStores({
                lat: newCenter.lat,
                lng: newCenter.lng,
              });
            }
          }
        } catch {
          // Failed to get center location, ignore
        }
      }, 500);
    },
    [fetchNearbyStores, searchRadius],
  );

  const handleViewDetail = useCallback((storeId: string) => {
    Taro.navigateTo({ url: `/pages/store/detail/index?id=${storeId}` });
  }, []);

  const handleNavigate = useCallback((store: NearbyStore) => {
    Taro.openLocation({
      latitude: store.lat,
      longitude: store.lng,
      name: store.name,
      address: store.address,
    });
  }, []);

  const handleBookAppointment = useCallback((storeId: string) => {
    Taro.navigateTo({
      url: `/pages/appointment/create/index?storeId=${storeId}`,
    });
  }, []);

  const handleExpandSearch = useCallback(() => {
    expandSearchRadius();
    const loc = useStoreStore.getState().userLocation;
    if (loc) {
      fetchNearbyStores({ lat: loc.latitude, lng: loc.longitude });
    }
  }, [expandSearchRadius, fetchNearbyStores]);

  const handleRetry = useCallback(() => {
    const loc = useStoreStore.getState().userLocation;
    if (loc) {
      fetchNearbyStores({ lat: loc.latitude, lng: loc.longitude });
    }
  }, [fetchNearbyStores]);

  const defaultLat = userLocation?.latitude ?? 39.9042;
  const defaultLng = userLocation?.longitude ?? 116.4074;

  return (
    <View className='store-map-page'>
      <StoreMap
        stores={nearbyStores}
        loading={nearbyStoresLoading}
        error={!!nearbyStoresError}
        latitude={defaultLat}
        longitude={defaultLng}
        locationAuthorized={locationAuthorized !== false}
        onMarkerTap={handleMarkerTap}
        onRegionChange={handleRegionChange}
        onRetry={handleRetry}
        onExpandSearch={handleExpandSearch}
        onMapReady={handleMapReady}
      />

      {/* Marker tap popup card */}
      {selectedStore && (
        <View className='marker-popup-card'>
          <StoreCard
            store={selectedStore}
            mode='brief'
            showActions
            onViewDetail={handleViewDetail}
            onNavigate={handleNavigate}
            onBook={handleBookAppointment}
          />
        </View>
      )}

      {/* Bottom drawer */}
      <View
        className={`bottom-drawer ${drawerExpanded ? 'expanded' : ''}`}
        onClick={() => !drawerExpanded && setDrawerExpanded(true)}
      >
        <View
          className='drawer-handle'
          onClick={() => setDrawerExpanded(!drawerExpanded)}
        >
          <View className='drawer-handle-bar' />
        </View>
        {nearbyStores.length > 0 && (
          <View className='drawer-list'>
            {nearbyStores.map((store, index) => (
              <StoreCard
                key={store.id}
                store={store}
                mode='list-item'
                rank={index + 1}
                onViewDetail={handleViewDetail}
                onTap={() => handleViewDetail(store.id)}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

export default StoreIndex;
