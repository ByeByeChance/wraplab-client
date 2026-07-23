import { useState, useCallback } from 'react';
import { View, Text } from '@tarojs/components';
import './index.less';

interface VoteButtonProps {
  commentId: string;
  voteCount: number;
  isVoted: boolean;
  onToggle: (commentId: string) => void;
  size?: 'small' | 'default';
}

function formatVoteCount(count: number): string {
  if (count === 0) return '';
  if (count < 1000) return String(count);
  if (count < 10000) return (count / 1000).toFixed(1) + 'k';
  return (count / 10000).toFixed(1) + 'w';
}

export default function VoteButton({
  commentId,
  voteCount,
  isVoted,
  onToggle,
  size = 'default',
}: VoteButtonProps) {
  const [animating, setAnimating] = useState(false);
  const [debounceLock, setDebounceLock] = useState(false);

  const handleToggle = useCallback(() => {
    if (debounceLock) return;
    setDebounceLock(true);
    setAnimating(true);

    onToggle(commentId);

    setTimeout(() => {
      setAnimating(false);
    }, 300);

    setTimeout(() => {
      setDebounceLock(false);
    }, 200);
  }, [commentId, onToggle, debounceLock]);

  const rootClass = [
    'vote-btn',
    `vote-btn--${size}`,
    isVoted ? 'vote-btn--active' : '',
    animating ? 'vote-btn--bounce' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <View className={rootClass} onClick={handleToggle}>
      <Text className='vote-btn-icon'>{isVoted ? '▲' : '△'}</Text>
      {voteCount > 0 && (
        <Text className='vote-btn-count'>{formatVoteCount(voteCount)}</Text>
      )}
    </View>
  );
}
