import { View, Text, Button } from '@tarojs/components';

interface EmptyStateProps {
  /** 图标 (emoji 或文本) */
  icon?: string;
  /** 提示文案 */
  message: string;
  /** 辅助提示文案 */
  subMessage?: string;
  /** 引导按钮文案 (可选) */
  actionText?: string;
  /** 引导按钮点击回调 */
  onAction?: () => void;
}

export default function EmptyState({
  icon = '📭',
  message,
  subMessage,
  actionText,
  onAction,
}: EmptyStateProps) {
  return (
    <View className='empty-state'>
      <Text className='empty-state-icon'>{icon}</Text>
      <Text className='empty-state-message'>{message}</Text>
      {subMessage && <Text className='empty-state-sub'>{subMessage}</Text>}
      {actionText && onAction && (
        <Button className='empty-state-action' onClick={onAction}>
          {actionText}
        </Button>
      )}
    </View>
  );
}
