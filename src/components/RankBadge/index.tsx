import { View, Text } from '@tarojs/components';

interface RankBadgeProps {
  rank: number;
}

export default function RankBadge({ rank }: RankBadgeProps) {
  if (rank === 1) {
    return (
      <View className='rank-badge gold'>
        <Text className='rank-badge-text'>1</Text>
      </View>
    );
  }

  if (rank === 2) {
    return (
      <View className='rank-badge silver'>
        <Text className='rank-badge-text'>2</Text>
      </View>
    );
  }

  if (rank === 3) {
    return (
      <View className='rank-badge bronze'>
        <Text className='rank-badge-text'>3</Text>
      </View>
    );
  }

  return (
    <View className='rank-badge number'>
      <Text className='rank-badge-number'>{rank}</Text>
    </View>
  );
}
