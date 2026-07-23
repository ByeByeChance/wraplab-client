import { View, Text, Button, Textarea } from '@tarojs/components';
import { useState } from 'react';

interface CommentInputProps {
  onSubmit: (content: string, parentId?: string) => void;
  replyTo?: { id: string; userName: string; content: string } | null;
  onCancelReply?: () => void;
  cooldownSeconds: number;
  submitting?: boolean;
  maxLength?: number;
  placeholder?: string;
}

export default function CommentInput({
  onSubmit,
  replyTo,
  onCancelReply,
  cooldownSeconds,
  submitting = false,
  maxLength = 500,
  placeholder = '发表评论...',
}: CommentInputProps) {
  const [content, setContent] = useState('');
  const isCooldown = cooldownSeconds > 0;
  const trimmedContent = content.trim();
  const canSubmit = trimmedContent.length > 0 && !isCooldown && !submitting;

  const handleSubmit = (): void => {
    if (!canSubmit) return;
    onSubmit(trimmedContent, replyTo?.id);
    setContent('');
  };

  const replyPlaceholder = replyTo ? `回复 @${replyTo.userName}...` : placeholder;

  return (
    <View className='comment-input'>
      {/* 回复模式指示条 */}
      {replyTo && (
        <View className='comment-input-reply-bar'>
          <Text className='comment-input-reply-text' numberOfLines={1}>
            回复 @{replyTo.userName}: {replyTo.content.slice(0, 30)}
            {replyTo.content.length > 30 ? '...' : ''}
          </Text>
          {onCancelReply && (
            <Text className='comment-input-cancel' onClick={onCancelReply}>
              取消
            </Text>
          )}
        </View>
      )}

      {/* 输入区 */}
      <View className='comment-input-row'>
        <Textarea
          className={`comment-input-textarea ${canSubmit ? 'active' : ''}`}
          value={content}
          onInput={(e) => setContent(e.detail.value)}
          placeholder={replyPlaceholder}
          placeholderStyle='color: #BFBFBF; font-size: 28rpx;'
          maxlength={maxLength}
          autoHeight
          adjustPosition
          confirmType='send'
          disabled={submitting}
        />
        <Button
          className={`comment-input-send ${canSubmit ? 'active' : 'disabled'}`}
          onClick={handleSubmit}
          disabled={!canSubmit}
          loading={submitting}
        >
          发送
        </Button>
      </View>

      {/* 字数计数器 */}
      <Text className={`comment-input-counter ${content.length >= maxLength ? 'over' : ''}`}>
        {content.length}/{maxLength}
      </Text>

      {/* 冷却倒计时 */}
      {isCooldown && (
        <Text className='comment-input-cooldown'>
          {cooldownSeconds}s 后可再次评论
        </Text>
      )}
    </View>
  );
}
