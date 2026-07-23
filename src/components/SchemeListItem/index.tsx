import { View, Text, Image } from '@tarojs/components';
import type { Configuration } from '../../types';

interface SchemeListItemProps {
  scheme: Configuration;
  onTap: (scheme: Configuration) => void;
}

export default function SchemeListItem({ scheme, onTap }: SchemeListItemProps) {
  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      const h = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      return `${y}-${m}-${d} ${h}:${min}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <View className='scheme-list-item' onClick={() => onTap(scheme)}>
      <Image
        className='scheme-list-thumbnail'
        src={scheme.thumbnail || ''}
        mode='aspectFill'
      />
      <View className='scheme-list-info'>
        <Text className='scheme-list-name' numberOfLines={1}>
          {scheme.brandName} {scheme.seriesName} {scheme.modelName}
        </Text>
        <View className='scheme-list-color-row'>
          {scheme.hex && (
            <View
              className='scheme-list-mini-swatch'
              style={{ backgroundColor: scheme.hex }}
            />
          )}
          <Text className='scheme-list-color-name' numberOfLines={1}>
            {scheme.swatchName || scheme.hex || '未选择颜色'}
          </Text>
        </View>
        {scheme.materialName && (
          <Text className='scheme-list-material'>材质：{scheme.materialName}</Text>
        )}
        <Text className='scheme-list-date'>{formatDate(scheme.createdAt)}</Text>
      </View>
    </View>
  );
}
