import { View, Text } from '@tarojs/components';
import type { WaitlistEntry } from '../../../types';
import './index.less';

interface WaitlistCardProps {
  entry: WaitlistEntry;
  onPress: (waitlistId: string) => void;
  actionable: boolean;
  onCancel?: (waitlistId: string) => void;
}

const STATUS_CONFIG: Record<string, { label: string; dotColor: string; actionLabel?: string }> = {
  waiting: { label: '候补中', dotColor: '#FAAD14', actionLabel: '取消候补' },
  promoted: { label: '已排到', dotColor: '#52C41A', actionLabel: '查看预约' },
  cancelled: { label: '已取消', dotColor: '#D9D9D9' },
};

export default function WaitlistCard({
  entry,
  onPress,
  actionable,
  onCancel,
}: WaitlistCardProps) {
  const config = STATUS_CONFIG[entry.status] || STATUS_CONFIG.waiting;
  const badgeBg = entry.status === 'waiting' ? '#FAAD14' : entry.status === 'promoted' ? '#52C41A' : '#D9D9D9';

  return (
    <View className='waitlist-card' onClick={() => onPress(entry.waitlistId)}>
      {/* Position Badge */}
      <View className='waitlist-card-badge' style={{ backgroundColor: badgeBg }}>
        <Text className='waitlist-card-badge-text'>{entry.position}</Text>
      </View>

      {/* Info */}
      <View className='waitlist-card-body'>
        <View className='waitlist-card-row-1'>
          <Text className='waitlist-card-store'>{entry.storeName}</Text>
          <Text className='waitlist-card-sep'>·</Text>
          <Text className='waitlist-card-date'>{entry.date}</Text>
        </View>
        <Text className='waitlist-card-slot'>{entry.timeSlot}</Text>
        <View className='waitlist-card-row-2'>
          <View className='waitlist-card-status'>
            <View
              className='waitlist-card-status-dot'
              style={{ backgroundColor: config.dotColor }}
            />
            <Text className='waitlist-card-status-text' style={{ color: config.dotColor }}>
              {config.label}
            </Text>
          </View>
        </View>
      </View>

      {/* Action */}
      {actionable && config.actionLabel && onCancel && (
        <View
          className='waitlist-card-action'
          onClick={(e) => {
            e.stopPropagation();
            onCancel(entry.waitlistId);
          }}
        >
          <Text className='waitlist-card-action-text'>{config.actionLabel}</Text>
        </View>
      )}
    </View>
  );
}
