import { View, Text, Image } from '@tarojs/components';
import type { HotScheme } from '../../types';

interface HotSchemeCardProps {
  scheme: HotScheme;
  onTap: (scheme: HotScheme) => void;
}

export default function HotSchemeCard({ scheme, onTap }: HotSchemeCardProps) {
  return (
    <View className='hot-scheme-card' onClick={() => onTap(scheme)}>
      <Image
        className='hot-scheme-image'
        src={scheme.thumbnail || ''}
        mode='aspectFill'
      />
      <View className='hot-scheme-info'>
        <Text className='hot-scheme-title' numberOfLines={1}>
          {scheme.brandName} {scheme.seriesName}
        </Text>
        <Text className='hot-scheme-color' numberOfLines={1}>
          {scheme.swatchName || scheme.hex || ''}
        </Text>
        {scheme.swatches && scheme.swatches.length > 0 && (
          <View className='hot-scheme-swatches'>
            {scheme.swatches.map((s, i) => (
              <View
                key={i}
                className='hot-scheme-mini-swatch'
                style={{ backgroundColor: s.hex }}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
