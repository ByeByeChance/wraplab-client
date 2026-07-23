import { ScrollView, View, Text } from '@tarojs/components';
import ErrorState from '../ErrorState';
import type { Material } from '../../types';

interface MaterialSelectorProps {
  /** 材质列表 */
  materials: Material[];
  /** 当前选中的材质 ID */
  selectedId?: string;
  /** 加载中 */
  loading?: boolean;
  /** 加载失败 */
  error?: boolean;
  /** 选择回调 */
  onSelect: (material: Material) => void;
  /** 重试回调 */
  onRetry: () => void;
}

export default function MaterialSelector({
  materials,
  selectedId,
  loading = false,
  error = false,
  onSelect,
  onRetry,
}: MaterialSelectorProps) {
  if (loading) {
    return (
      <View className='material-selector'>
        <View className='material-selector-scroll'>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} className='material-item material-item--skeleton'>
              <View className='skeleton-shimmer' style={{ width: '100rpx', height: '32rpx', borderRadius: '28rpx' }} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View className='material-selector'>
        <ErrorState message='材质加载失败' onRetry={onRetry} />
      </View>
    );
  }

  if (materials.length === 0) {
    return null;
  }

  return (
    <View className='material-selector'>
      <ScrollView className='material-selector-scroll' scrollX>
        {materials.map((material) => (
          <View
            key={material.id}
            className={`material-item ${selectedId === material.id ? 'material-item--active' : ''}`}
            onClick={() => onSelect(material)}
          >
            <Text className='material-item-text'>{material.name}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
