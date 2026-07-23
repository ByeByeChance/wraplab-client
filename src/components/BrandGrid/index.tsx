import { View, Text, Image } from '@tarojs/components';
import LoadingSkeleton from '../LoadingSkeleton';
import ErrorState from '../ErrorState';
import EmptyState from '../EmptyState';
import type { Brand } from '../../types';

interface BrandGridProps {
  /** 品牌列表 */
  brands: Brand[];
  /** 加载中 */
  loading?: boolean;
  /** 加载失败 */
  error?: boolean;
  /** 错误文案 */
  errorMessage?: string;
  /** 品牌点击回调 */
  onBrandTap: (brand: Brand) => void;
  /** 重试回调 */
  onRetry: () => void;
}

export default function BrandGrid({
  brands,
  loading = false,
  error = false,
  errorMessage,
  onBrandTap,
  onRetry,
}: BrandGridProps) {
  if (loading) {
    return (
      <View className='brand-grid'>
        <LoadingSkeleton type='brand-grid' count={8} />
      </View>
    );
  }

  if (error) {
    return <ErrorState message={errorMessage || '品牌加载失败'} onRetry={onRetry} />;
  }

  if (brands.length === 0) {
    return (
      <EmptyState
        icon='🚗'
        message='暂无品牌数据'
        subMessage='敬请期待更多品牌上线'
      />
    );
  }

  return (
    <View className='brand-grid'>
      {brands.map((brand) => (
        <View
          key={brand.id}
          className='brand-grid-item'
          onClick={() => onBrandTap(brand)}
        >
          <Image
            className='brand-grid-logo'
            src={brand.logo}
            mode='aspectFit'
          />
          <Text className='brand-grid-name'>{brand.name}</Text>
        </View>
      ))}
    </View>
  );
}
