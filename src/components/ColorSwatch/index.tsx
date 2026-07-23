import { useState } from 'react';
import { ScrollView, View, Text } from '@tarojs/components';
import LoadingSkeleton from '../LoadingSkeleton';
import ErrorState from '../ErrorState';
import EmptyState from '../EmptyState';
import CustomColorPicker from '../CustomColorPicker';
import type { ColorBrand, ColorSwatchItem } from '../../types';

interface ColorSwatchProps {
  /** 色卡品牌列表 */
  brands: ColorBrand[];
  /** 当前选中品牌下的颜色列表 */
  swatches: ColorSwatchItem[];
  /** 当前选中的颜色 hex (用于高亮态) */
  selectedHex?: string;
  /** 色卡品牌加载中 */
  brandsLoading?: boolean;
  /** 颜色列表加载中 */
  swatchesLoading?: boolean;
  /** 品牌列表加载失败 */
  brandsError?: boolean;
  /** 颜色列表加载失败 */
  swatchesError?: boolean;
  /** 当前选中的品牌 ID */
  selectedBrandId?: string;
  /** 品牌 Tab 切换回调 */
  onBrandChange: (brandId: string) => void;
  /** 颜色选择回调 */
  onColorSelect: (swatch: ColorSwatchItem) => void;
  /** 自定义颜色确认回调 */
  onCustomColor: (hex: string) => void;
  /** 品牌列表重试回调 */
  onBrandsRetry: () => void;
  /** 颜色列表重试回调 */
  onSwatchesRetry: () => void;
}

export default function ColorSwatch({
  brands,
  swatches,
  selectedHex,
  brandsLoading = false,
  swatchesLoading = false,
  brandsError = false,
  swatchesError = false,
  selectedBrandId,
  onBrandChange,
  onColorSelect,
  onCustomColor,
  onBrandsRetry,
  onSwatchesRetry,
}: ColorSwatchProps) {
  const [customColorVisible, setCustomColorVisible] = useState(false);

  // 品牌 Tab 栏
  const renderBrandTabs = () => {
    if (brandsLoading) {
      return (
        <View className='swatch-brand-tabs'>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} className='swatch-brand-tab swatch-brand-tab--skeleton'>
              <View className='skeleton-shimmer' style={{ width: '60rpx', height: '24rpx', borderRadius: '4rpx' }} />
            </View>
          ))}
        </View>
      );
    }

    if (brandsError) {
      return (
        <View className='swatch-brand-error'>
          <Text className='swatch-brand-error-text'>品牌加载失败</Text>
          <Text className='swatch-brand-retry' onClick={onBrandsRetry}>重试</Text>
        </View>
      );
    }

    return (
      <ScrollView className='swatch-brand-tabs' scrollX>
        {brands.map((brand) => (
          <View
            key={brand.id}
            className={`swatch-brand-tab ${selectedBrandId === brand.id ? 'swatch-brand-tab--active' : ''}`}
            onClick={() => onBrandChange(brand.id)}
          >
            <Text className='swatch-brand-tab-text'>{brand.name}</Text>
            {selectedBrandId === brand.id && <View className='swatch-brand-indicator' />}
          </View>
        ))}
      </ScrollView>
    );
  };

  // 颜色网格
  const renderSwatchGrid = () => {
    if (swatchesLoading) {
      return <LoadingSkeleton type='swatch-grid' count={10} />;
    }

    if (swatchesError) {
      return <ErrorState message='色卡加载失败' onRetry={onSwatchesRetry} />;
    }

    if (!selectedBrandId) {
      return <EmptyState message='请选择色卡品牌' />;
    }

    if (swatches.length === 0) {
      return (
        <EmptyState
          message='该品牌暂无颜色数据'
          actionText='尝试其他品牌'
        />
      );
    }

    return (
      <View className='swatch-grid'>
        {swatches.map((swatch) => (
          <View
            key={swatch.id}
            className={`swatch-item ${selectedHex === swatch.hex ? 'swatch-item--selected' : ''}`}
            onClick={() => onColorSelect(swatch)}
          >
            <View
              className='swatch-block'
              style={{ backgroundColor: swatch.hex }}
            />
            <Text className='swatch-name' numberOfLines={1}>{swatch.name}</Text>
          </View>
        ))}
        {/* 自定义颜色入口 */}
        <View
          className='swatch-item swatch-item--custom'
          onClick={() => setCustomColorVisible(true)}
        >
          <View className='swatch-block swatch-block--custom'>
            <Text className='swatch-custom-plus'>+</Text>
          </View>
          <Text className='swatch-name'>自定义</Text>
        </View>
      </View>
    );
  };

  return (
    <View className='color-swatch'>
      {/* 品牌 Tab 栏 */}
      {renderBrandTabs()}

      {/* 颜色网格 */}
      <View className='swatch-grid-container'>
        {renderSwatchGrid()}
      </View>

      {/* 自定义颜色底部面板 */}
      <CustomColorPicker
        visible={customColorVisible}
        onConfirm={(hex: string) => {
          onCustomColor(hex);
          setCustomColorVisible(false);
        }}
        onCancel={() => setCustomColorVisible(false)}
      />
    </View>
  );
}
