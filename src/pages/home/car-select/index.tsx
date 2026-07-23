import { useEffect, useState, useCallback, useMemo } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { View, Text, Image } from '@tarojs/components';
import { useVehicleStore } from '../../../stores/vehicle-store';
import LoadingSkeleton from '../../../components/LoadingSkeleton';
import ErrorState from '../../../components/ErrorState';
import EmptyState from '../../../components/EmptyState';
import { navigateToDesign } from '../../../utils/navigate';
import type { Brand, Series, Model } from '../../../types';
import './index.less';

/** 选择层级 */
type SelectionLevel = 'brand' | 'series' | 'model';

export default function CarSelectPage() {
  const router = useRouter();
  const { brandId: routeBrandId } = router.params;

  const vehicleStore = useVehicleStore();
  const {
    brands, brandsLoading, brandsError,
    series, seriesLoading, seriesError,
    models, modelsLoading, modelsError,
    selectedBrand, selectedSeries,
    fetchBrands, selectBrand,
    selectSeries, selectModel,
    resetToBrands, resetToSeries,
  } = vehicleStore;

  const [level, setLevel] = useState<SelectionLevel>('brand');
  const [selectedYear, setSelectedYear] = useState<string>('全部');

  /** 初始化 */
  useEffect(() => {
    fetchBrands();
    if (routeBrandId) {
      // 如果有 brandId 参数，尝试定位到该品牌
      // 这里简化处理，等品牌加载后自动选中
    }
  }, []);

  /** 当品牌数据加载完，如果 URL 有 brandId 则自动选中 */
  useEffect(() => {
    if (routeBrandId && brands.length > 0 && level === 'brand') {
      const targetBrand = brands.find((b) => b.id === routeBrandId);
      if (targetBrand) {
        handleBrandSelect(targetBrand);
      }
    }
  }, [routeBrandId, brands]);

  /** 可用年份列表 (从型号中提取) */
  const availableYears = useMemo(() => {
    if (models.length === 0) return ['全部'];
    const years = new Set(models.map((m) => String(m.year)));
    return ['全部', ...Array.from(years).sort((a, b) => Number(b) - Number(a))];
  }, [models]);

  /** 按年份筛选型号 */
  const filteredModels = useMemo(() => {
    if (selectedYear === '全部') return models;
    return models.filter((m) => String(m.year) === selectedYear);
  }, [models, selectedYear]);

  /** 处理品牌选择 */
  const handleBrandSelect = useCallback(async (brand: Brand) => {
    await selectBrand(brand);
    setLevel('series');
  }, [selectBrand]);

  /** 处理车系选择 */
  const handleSeriesSelect = useCallback(async (s: Series) => {
    await selectSeries(s);
    setLevel('model');
  }, [selectSeries]);

  /** 处理型号选择 */
  const handleModelSelect = useCallback((model: Model) => {
    selectModel(model);
    navigateToDesign({ modelId: model.id });
  }, [selectModel]);

  /** 处理返回 */
  const handleBack = useCallback(() => {
    if (level === 'model') {
      setLevel('series');
      setSelectedYear('全部');
      resetToSeries(selectedBrand?.id || '');
    } else if (level === 'series') {
      setLevel('brand');
      resetToBrands();
    } else {
      Taro.navigateBack();
    }
  }, [level, selectedBrand, resetToSeries, resetToBrands]);

  /** 面包屑点击 */
  const handleBreadcrumbTap = useCallback((targetLevel: SelectionLevel) => {
    if (targetLevel === 'brand') {
      setLevel('brand');
      resetToBrands();
    } else if (targetLevel === 'series') {
      setLevel('series');
      setSelectedYear('全部');
      resetToSeries(selectedBrand?.id || '');
    }
  }, [selectedBrand, resetToBrands, resetToSeries]);

  /** 渲染面包屑 */
  const renderBreadcrumb = () => {
    if (level === 'brand') return null;

    return (
      <View className='breadcrumb'>
        <Text
          className='breadcrumb-item'
          onClick={() => handleBreadcrumbTap('brand')}
        >
          全部品牌
        </Text>
        {selectedBrand && (
          <>
            <Text className='breadcrumb-separator'>{'>'}</Text>
            <Text
              className={`breadcrumb-item ${level === 'model' ? '' : 'breadcrumb-item--active'}`}
              onClick={() => handleBreadcrumbTap('series')}
            >
              {selectedBrand.name}
            </Text>
          </>
        )}
        {selectedSeries && level === 'model' && (
          <>
            <Text className='breadcrumb-separator'>{'>'}</Text>
            <Text className='breadcrumb-item breadcrumb-item--active'>
              {selectedSeries.name}
            </Text>
          </>
        )}
      </View>
    );
  };

  /** 渲染品牌列表 */
  const renderBrandList = () => {
    if (brandsLoading) {
      return <LoadingSkeleton type='list-item' count={6} />;
    }
    if (brandsError) {
      return <ErrorState message={brandsError} onRetry={fetchBrands} />;
    }
    if (brands.length === 0) {
      return <EmptyState message='暂无品牌数据' subMessage='请联系管理员添加车型品牌' />;
    }
    return (
      <View className='select-list'>
        {brands.map((brand) => (
          <View
            key={brand.id}
            className='select-list-item select-list-item--brand'
            onClick={() => handleBrandSelect(brand)}
          >
            <Image className='select-list-logo' src={brand.logo} mode='aspectFit' />
            <View className='select-list-info'>
              <Text className='select-list-name'>{brand.name}</Text>
            </View>
            <Text className='select-list-arrow'>{'>'}</Text>
          </View>
        ))}
      </View>
    );
  };

  /** 渲染车系列表 */
  const renderSeriesList = () => {
    if (seriesLoading) {
      return <LoadingSkeleton type='list-item' count={5} />;
    }
    if (seriesError) {
      return <ErrorState message={seriesError} onRetry={() => selectedBrand && vehicleStore.fetchSeries(selectedBrand.id)} />;
    }
    if (series.length === 0) {
      return (
        <EmptyState
          message='该品牌暂无车系数据'
          actionText='返回品牌列表'
          onAction={handleBack}
        />
      );
    }
    return (
      <View className='select-list'>
        {series.map((s) => (
          <View
            key={s.id}
            className='select-list-item select-list-item--series'
            onClick={() => handleSeriesSelect(s)}
          >
            <View className='select-list-info'>
              <View className='select-list-row'>
                <Text className='select-list-name'>{s.name}</Text>
                <Text className='select-list-year-range'>
                  {s.yearStart}-{s.yearEnd}
                </Text>
              </View>
              {s.bodyTypes && s.bodyTypes.length > 0 && (
                <Text className='select-list-sub'>{s.bodyTypes.join(' / ')}</Text>
              )}
            </View>
            <Text className='select-list-arrow'>{'>'}</Text>
          </View>
        ))}
      </View>
    );
  };

  /** 渲染型号列表 */
  const renderModelList = () => {
    if (modelsLoading) {
      return <LoadingSkeleton type='list-item' count={5} />;
    }
    if (modelsError) {
      return <ErrorState message={modelsError} onRetry={() => selectedSeries && vehicleStore.fetchModels(selectedSeries.id)} />;
    }
    if (filteredModels.length === 0) {
      return (
        <EmptyState
          message='该车系暂无型号数据'
          actionText='返回车系列表'
          onAction={handleBack}
        />
      );
    }
    return (
      <View className='select-list'>
        {filteredModels.map((model) => (
          <View
            key={model.id}
            className='select-list-item select-list-item--model'
            onClick={() => handleModelSelect(model)}
          >
            <View className='select-list-info'>
              <View className='select-list-row'>
                <Text className='select-list-name'>{model.name}</Text>
              </View>
              <View className='select-list-tags'>
                {model.year && (
                  <Text className='select-list-tag select-list-tag--year'>[{model.year}]</Text>
                )}
                {model.bodyType && (
                  <Text className='select-list-tag select-list-tag--type'>{model.bodyType}</Text>
                )}
              </View>
            </View>
            <Text className='select-list-arrow'>{'>'}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View className='page-container'>
      {/* 面包屑导航 */}
      {renderBreadcrumb()}

      {/* 年份筛选标签栏 (仅型号列表展示) */}
      {level === 'model' && availableYears.length > 1 && (
        <View className='year-filter-tags'>
          {availableYears.map((year) => (
            <Text
              key={year}
              className={`year-filter-tag ${selectedYear === year ? 'year-filter-tag--active' : ''}`}
              onClick={() => setSelectedYear(year)}
            >
              {year}
            </Text>
          ))}
        </View>
      )}

      {/* 列表内容 */}
      <View className='page-scroll'>
        {level === 'brand' && renderBrandList()}
        {level === 'series' && renderSeriesList()}
        {level === 'model' && renderModelList()}
      </View>
    </View>
  );
}
