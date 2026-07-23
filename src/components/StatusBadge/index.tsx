import { View, Text } from '@tarojs/components';

interface StatusBadgeProps {
  status: string;
  label?: string;
  size?: 'small' | 'default';
}

const STATUS_COLOR_MAP: Record<
  string,
  { color: string; bg: string; label: string }
> = {
  pending: { color: '#FA8C16', bg: '#FFF7E6', label: '待确认' },
  confirmed: { color: '#1677FF', bg: '#E6F4FF', label: '已确认' },
  completed: { color: '#52C41A', bg: '#F6FFED', label: '已完成' },
  cancelled: { color: '#999999', bg: '#F5F5F5', label: '已取消' },
  submitted: { color: '#1677FF', bg: '#E6F4FF', label: '已提交' },
  followed: { color: '#722ED1', bg: '#F9F0FF', label: '已跟进' },
  deal_closed: { color: '#52C41A', bg: '#F6FFED', label: '已成交' },
  expired: { color: '#999999', bg: '#F5F5F5', label: '已失效' },
  __default__: { color: '#999999', bg: '#F5F5F5', label: '--' },
};

function getStatusStyle(status: string) {
  return STATUS_COLOR_MAP[status] ?? STATUS_COLOR_MAP.__default__;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'default',
}) => {
  const style = getStatusStyle(status);

  const padding = size === 'small' ? '2px 12px' : '4px 16px';
  const borderRadius = size === 'small' ? '6px' : '8px';
  const fontSize = size === 'small' ? '20rpx' : '22rpx';

  return (
    <View
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding,
        borderRadius,
        backgroundColor: style.bg,
      }}
    >
      <Text
        style={{
          color: style.color,
          fontSize,
          fontWeight: 500,
        }}
      >
        {label ?? style.label}
      </Text>
    </View>
  );
};

export default StatusBadge;
