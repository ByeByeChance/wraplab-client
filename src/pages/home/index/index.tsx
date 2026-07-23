import { useEffect, useState, useCallback } from 'react';
import Taro, { usePullDownRefresh } from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { useVehicleStore } from '../../../stores/vehicle-store';
import BrandGrid from '../../../components/BrandGrid';
import HotSchemeCard from '../../../components/HotSchemeCard';
import LoadingSkeleton from '../../../components/LoadingSkeleton';
import EmptyState from '../../../components/EmptyState';
import ErrorState from '../../../components/ErrorState';
import { navigateToCarSelect, navigateToDesign } from '../../../utils/navigate';
import type { Brand, HotScheme } from '../../../types';
import './index.less';

export default function HomePage() {
  const vehicleStore = useVehicleStore();
  const { brands, brandsLoading, brandsError, fetchBrands } = vehicleStore;

  const [hotSchemes, setHotSchemes] = useState<HotScheme[]>([]);
  const [hotSchemesLoading, setHotSchemesLoading] = useState(true);
  const [hotSchemesError, setHotSchemesError] = useState<string | null>(null);

  /** 加载数据 */
  const loadData = useCallback(async () => {
    // 加载品牌
    fetchBrands();
    // 加载热门方案
    setHotSchemesLoading(true);
    setHotSchemesError(null);
    try {
      // Phase 1: mock data or API call
      const mockHotSchemes: HotScheme[] = [
        {
          id: '1', modelId: 'm1', modelName: '330i', brandName: '宝马',
          seriesName: '3系', swatchName: '哑光磨砂灰', hex: '#636363',
          thumbnail: '', swatches: [{ hex: '#636363', name: '哑光磨砂灰' }],
        },
        {
          id: '2', modelId: 'm2', modelName: 'Model Y', brandName: '特斯拉',
          seriesName: 'Model Y', swatchName: '液态金属银', hex: '#C0C0C0',
          thumbnail: '', swatches: [{ hex: '#C0C0C0', name: '液态金属银' }],
        },
        {
          id: '3', modelId: 'm3', modelName: '718', brandName: '保时捷',
          seriesName: '718', swatchName: '迈阿密蓝', hex: '#0077B6',
          thumbnail: '', swatches: [{ hex: '#0077B6', name: '迈阿密蓝' }],
        },
      ];
      setHotSchemes(mockHotSchemes);
      setHotSchemesLoading(false);
    } catch (error) {
      setHotSchemesError('热门方案加载失败');
      setHotSchemesLoading(false);
    }
  }, [fetchBrands]);

  useEffect(() => {
    loadData();
  }, []);

  usePullDownRefresh(() => {
    loadData().finally(() => {
      Taro.stopPullDownRefresh();
    });
  });

  const handleBrandTap = useCallback((brand: Brand) => {
    navigateToCarSelect(brand.id);
  }, []);

  const handleHotSchemeTap = useCallback((scheme: HotScheme) => {
    navigateToDesign({
      modelId: scheme.modelId,
      configurationId: scheme.id,
    });
  }, []);

  const handleRetry = useCallback(() => {
    loadData();
  }, [loadData]);

  return (
    <View className='page-container'>
      <View className='page-scroll'>
        {/* 品牌车型 */}
        <View className='home-section'>
          <View className='home-section-header'>
            <Text className='home-section-title'>品牌车型</Text>
          </View>
          <BrandGrid
            brands={brands.slice(0, 8)}
            loading={brandsLoading}
            error={Boolean(brandsError)}
            errorMessage={brandsError || undefined}
            onBrandTap={handleBrandTap}
            onRetry={handleRetry}
          />
        </View>

        {/* 热门方案 */}
        <View className='home-section'>
          <View className='home-section-header'>
            <Text className='home-section-title'>热门改色方案</Text>
            <Text className='home-section-more'>{'>'}</Text>
          </View>
          {hotSchemesLoading ? (
            <View className='home-hot-schemes'>
              <LoadingSkeleton type='scheme-list' count={3} />
            </View>
          ) : hotSchemesError ? (
            <ErrorState message={hotSchemesError} onRetry={handleRetry} />
          ) : hotSchemes.length === 0 ? (
            <EmptyState
              message='暂无热门推荐'
              subMessage='敬请期待'
            />
          ) : (
            <ScrollView className='home-hot-schemes' scrollX>
              {hotSchemes.map((scheme) => (
                <HotSchemeCard
                  key={scheme.id}
                  scheme={scheme}
                  onTap={handleHotSchemeTap}
                />
              ))}
            </ScrollView>
          )}
        </View>

        {/* 开始设计主按钮 */}
        <View className='home-cta'>
          <View
            className='btn-primary'
            onClick={() => navigateToCarSelect()}
          >
            🎨  开始为客户设计
          </View>
        </View>
      </View>
    </View>
  );
}
