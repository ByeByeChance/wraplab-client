import { View, Text, Image, ScrollView } from '@tarojs/components';
import LoadingSkeleton from '../LoadingSkeleton/index';
import EmptyState from '../EmptyState/index';
import ErrorState from '../ErrorState/index';
import type { CommentItem } from '../../types';

interface CommentListProps {
  /** 评论数据 */
  comments: CommentItem[];
  /** 加载中 */
  loading: boolean;
  /** 加载失败 */
  error: string | null;
  /** 空状态文案 */
  emptyText?: string;
  /** 分页 */
  hasMore: boolean;
  /** 回调 */
  onLoadMore: () => void;
  onRetry: () => void;
  onSubmitComment: (content: string, parentId?: string) => void;
  onDeleteComment?: (commentId: string) => void;
  onApproveComment?: (commentId: string) => void;
  onRejectComment?: (commentId: string) => void;
  onReplyClick?: (commentId: string, userName: string, content: string) => void;
  rateLimitCooldown?: number;
  showAdminActions?: boolean;
}

export default function CommentList({
  comments,
  loading,
  error,
  hasMore,
  emptyText = '暂无评论，来抢沙发',
  onLoadMore,
  onRetry,
  onDeleteComment,
  onApproveComment,
  onRejectComment,
  onReplyClick,
  showAdminActions = false,
}: CommentListProps) {
  // Loading state
  if (loading && comments.length === 0) {
    return (
      <View className='comment-list'>
        <LoadingSkeleton type='list-item' count={5} />
      </View>
    );
  }

  // Error state
  if (error && comments.length === 0) {
    return (
      <View className='comment-list'>
        <ErrorState
          message={error}
          onRetry={onRetry}
        />
      </View>
    );
  }

  // Empty state
  if (!loading && !error && comments.length === 0) {
    return (
      <View className='comment-list'>
        <EmptyState message={emptyText} />
        <View className='comment-empty-guide'>
          <Text className='comment-empty-arrow'>↓</Text>
          <Text className='comment-empty-tip'>点击这里开始评论</Text>
        </View>
      </View>
    );
  }

  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes} 分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小时前`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} 天前`;
    return date.toLocaleDateString();
  };

  const renderReplies = (replies: CommentItem[]): React.ReactNode => {
    if (!replies || replies.length === 0) return null;
    const showReplies = replies.slice(0, 3);

    return (
      <View className='comment-replies'>
        {showReplies.map((reply) => (
          <View key={reply.id} className='comment-reply-item'>
            <Text className='comment-reply-content'>
              <Text className='comment-reply-author'>{reply.authorName}</Text>
              {reply.replyToUserName && (
                <Text className='comment-reply-target'> 回复 @{reply.replyToUserName}：</Text>
              )}
              {!reply.replyToUserName && '：'}
              {reply.content}
            </Text>
            <View className='comment-reply-meta'>
              <Text className='comment-reply-time'>{formatTime(reply.createdAt)}</Text>
              {onDeleteComment && (
                <Text
                  className='comment-delete-btn'
                  onClick={() => onDeleteComment(reply.id)}
                >
                  删除
                </Text>
              )}
            </View>
          </View>
        ))}
        {replies.length > 3 && (
          <Text className='comment-reply-more'>
            查看全部 {replies.length} 条回复
          </Text>
        )}
      </View>
    );
  };

  return (
    <View className='comment-list'>
      <ScrollView
        scrollY
        className='comment-scroll'
        onScrollToLower={onLoadMore}
      >
        {comments.map((comment) => (
          <View key={comment.id} className='comment-item'>
            <View className='comment-avatar-wrap'>
              {comment.authorAvatar ? (
                <Image
                  className='comment-avatar'
                  src={comment.authorAvatar}
                  mode='aspectFill'
                />
              ) : (
                <View className='comment-avatar-default'>
                  <Text className='comment-avatar-initial'>
                    {comment.authorName ? comment.authorName.charAt(0) : '?'}
                  </Text>
                </View>
              )}
            </View>
            <View className='comment-body'>
              <View className='comment-header'>
                <Text className='comment-author'>{comment.authorName}</Text>
                {comment.status === 'pending' && (
                  <Text className='comment-pending-tag'>审核中</Text>
                )}
              </View>
              <Text className='comment-content'>{comment.content}</Text>
              <View className='comment-meta'>
                <Text className='comment-time'>{formatTime(comment.createdAt)}</Text>
                <View className='comment-actions'>
                  {onReplyClick && (
                    <Text
                      className='comment-reply-btn'
                      onClick={() =>
                        onReplyClick(comment.id, comment.authorName, comment.content)
                      }
                    >
                      回复
                    </Text>
                  )}
                  {showAdminActions && onApproveComment && (
                    <Text
                      className='comment-admin-btn approve'
                      onClick={() => onApproveComment(comment.id)}
                    >
                      通过
                    </Text>
                  )}
                  {showAdminActions && onRejectComment && (
                    <Text
                      className='comment-admin-btn reject'
                      onClick={() => onRejectComment(comment.id)}
                    >
                      拒绝
                    </Text>
                  )}
                  {onDeleteComment && (
                    <Text
                      className='comment-delete-btn'
                      onClick={() => onDeleteComment(comment.id)}
                    >
                      删除
                    </Text>
                  )}
                </View>
              </View>
              {comment.replies && comment.replies.length > 0 && renderReplies(comment.replies)}
            </View>
          </View>
        ))}

        {/* 加载更多 */}
        {hasMore && (
          <View className='comment-load-more'>
            <Text className='comment-load-more-text'>加载中...</Text>
          </View>
        )}
        {!hasMore && comments.length > 0 && (
          <View className='comment-load-end'>
            <Text className='comment-load-end-text'>已加载全部评论</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
