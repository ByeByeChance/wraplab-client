import { View, Text } from '@tarojs/components';

interface PartAreaTagProps {
  areaM2: number;
  active?: boolean;
}

export default function PartAreaTag({ areaM2, active = false }: PartAreaTagProps) {
  if (areaM2 <= 0) return null;

  return (
    <View className={`part-area-tag ${active ? 'active' : ''}`}>
      <Text className='part-area-text'>{areaM2} m²</Text>
    </View>
  );
}
