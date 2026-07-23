import { View, Text, ScrollView } from '@tarojs/components';
import type { RankPeriod, RankDimension } from '../../types';

interface RankingTabProps {
  activePeriod: RankPeriod;
  activeType: RankDimension;
  onPeriodChange: (period: RankPeriod) => void;
  onTypeChange: (type: RankDimension) => void;
}

const PERIOD_OPTIONS: { label: string; value: RankPeriod }[] = [
  { label: '日榜', value: 'daily' },
  { label: '周榜', value: 'weekly' },
  { label: '月榜', value: 'monthly' },
];

const TYPE_OPTIONS: { label: string; value: RankDimension }[] = [
  { label: '按点赞', value: 'like_count' },
  { label: '按浏览', value: 'view_count' },
  { label: '按评论', value: 'comment_count' },
];

export default function RankingTab({
  activePeriod,
  activeType,
  onPeriodChange,
  onTypeChange,
}: RankingTabProps) {
  return (
    <View className='ranking-tab'>
      {/* 周期切换 */}
      <ScrollView
        scrollX
        className='ranking-period-scroll'
        showScrollbar={false}
      >
        <View className='ranking-period-row'>
          {PERIOD_OPTIONS.map((opt) => (
            <View
              key={opt.value}
              className={`ranking-period-capsule ${activePeriod === opt.value ? 'active' : ''}`}
              onClick={() => onPeriodChange(opt.value)}
              style={{ minWidth: '88rpx', minHeight: '88rpx' }}
            >
              <Text className='ranking-period-label'>{opt.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* 维度切换 */}
      <View className='ranking-type-row'>
        {TYPE_OPTIONS.map((opt) => (
          <View
            key={opt.value}
            className={`ranking-type-item ${activeType === opt.value ? 'active' : ''}`}
            onClick={() => onTypeChange(opt.value)}
            style={{ minWidth: '88rpx', minHeight: '88rpx' }}
          >
            <Text className='ranking-type-label'>{opt.label}</Text>
            {activeType === opt.value && <View className='ranking-type-indicator' />}
          </View>
        ))}
      </View>
    </View>
  );
}
