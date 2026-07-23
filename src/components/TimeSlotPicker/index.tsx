import { View, Text } from '@tarojs/components';
import type { TimeSlot } from '../../types/phase3';

interface TimeSlotPickerProps {
  slots: TimeSlot[];
  selectedSlot?: string;
  loading?: boolean;
  error?: boolean;
  onSelect: (timeSlot: string) => void;
  onRetry: () => void;
}

const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  slots,
  selectedSlot,
  loading,
  error,
  onSelect,
  onRetry,
}) => {
  if (loading) {
    return (
      <View style={{ padding: '24rpx 32rpx' }}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={{
              height: '72rpx',
              backgroundColor: '#F5F5F5',
              borderRadius: '12rpx',
              marginBottom: '12rpx',
            }}
          />
        ))}
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24rpx 32rpx',
        }}
      >
        <Text style={{ fontSize: '24rpx', color: '#FF4D4F', marginBottom: '16rpx' }}>
          时段加载失败
        </Text>
        <View
          onClick={onRetry}
          style={{
            padding: '8rpx 24rpx',
            border: '1px solid #0F3460',
            borderRadius: '8rpx',
          }}
        >
          <Text style={{ fontSize: '24rpx', color: '#0F3460' }}>重新加载</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ padding: '24rpx 32rpx' }}>
      {slots.map((slot) => {
        const isSelected = selectedSlot === slot.timeSlot;
        const isDisabled = !slot.available;

        let borderStyle: string;
        let bgStyle: string;
        if (isSelected) {
          borderStyle = '2rpx solid #0F3460';
          bgStyle = '#F0F5FF';
        } else if (isDisabled) {
          borderStyle = '1px solid #E8E8E8';
          bgStyle = '#F5F5F5';
        } else {
          borderStyle = '1px solid #E8E8E8';
          bgStyle = '#FFFFFF';
        }

        let remainingColor: string;
        let remainingText: string;
        if (!slot.available) {
          remainingColor = '#FF4D4F';
          remainingText = '已约满';
        } else if (slot.remaining >= 3) {
          remainingColor = '#52C41A';
          remainingText = `剩余 ${slot.remaining} 位`;
        } else {
          remainingColor = '#FAAD14';
          remainingText = `仅剩 ${slot.remaining} 位`;
        }

        return (
          <View
            key={slot.timeSlot}
            onClick={() => {
              if (!isDisabled) onSelect(slot.timeSlot);
            }}
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              height: '72rpx',
              padding: '0 24rpx',
              backgroundColor: bgStyle,
              borderRadius: '12rpx',
              border: borderStyle,
              marginBottom: '12rpx',
              opacity: isDisabled ? 0.5 : 1,
            }}
          >
            <View style={{ display: 'flex', flexDirection: 'column' }}>
              <Text
                style={{
                  fontSize: '28rpx',
                  fontWeight: 500,
                  color: isDisabled ? '#BFBFBF' : '#1A1A2E',
                }}
              >
                {slot.label}
              </Text>
              <Text style={{ fontSize: '24rpx', color: remainingColor }}>
                {remainingText}
              </Text>
            </View>
            {isSelected && (
              <Text style={{ fontSize: '32rpx', color: '#0F3460' }}>✓</Text>
            )}
          </View>
        );
      })}
    </View>
  );
};

export default TimeSlotPicker;
