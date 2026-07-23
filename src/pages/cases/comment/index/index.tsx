import { useEffect, useCallback, useState } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { View } from '@tarojs/components';
import { useCommentStore } from '../../../../stores/comment-store';
import CommentList from '../../../../components/CommentList/index';
import CommentInput from '../../../../components/CommentInput/index';

interface ReplyTarget {
  id: string;
  userName: string;
  content: string;
}

export default function CaseCommentPage() {
  const router = useRouter();
  const caseId = router.params.caseId as string;

  const {
    comments,
    loading,
    error,
    hasMore,
    submitting,
    cooldownSeconds,
    fetchComments,
    loadMoreComments,
    postComment,
    deleteComment,
    restoreCooldown,
    reset,
  } = useCommentStore();

  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);

  useEffect(() => {
    if (caseId) {
      void fetchComments(caseId);
      restoreCooldown();
    }
    return () => {
      reset();
    };
  }, [caseId]);

  /** 发表评论/回复 */
  const handleSubmit = useCallback(
    (content: string, parentId?: string) => {
      if (!caseId) return;
      void postComment(caseId, content, parentId);
      setReplyTo(null);
    },
    [caseId, postComment],
  );

  /** 删除评论 */
  const handleDelete = useCallback(
    (commentId: string) => {
      if (!caseId) return;
      Taro.showModal({
        title: '确定删除这条评论吗？',
        showCancel: true,
        confirmText: '确定',
        cancelText: '取消',
        confirmColor: '#FF4D4F',
        success: (res) => {
          if (res.confirm) {
            void deleteComment(caseId, commentId);
          }
        },
      });
    },
    [caseId, deleteComment],
  );

  /** 回复评论 */
  const handleReplyClick = useCallback(
    (commentId: string, userName: string, content: string) => {
      setReplyTo({ id: commentId, userName, content });
    },
    [],
  );

  /** 取消回复 */
  const handleCancelReply = useCallback(() => {
    setReplyTo(null);
  }, []);

  /** 加载更多 */
  const handleLoadMore = useCallback(() => {
    if (!caseId) return;
    void loadMoreComments(caseId);
  }, [caseId, loadMoreComments]);

  /** 重试初始加载 */
  const handleRetry = useCallback(() => {
    if (!caseId) return;
    void fetchComments(caseId);
  }, [caseId, fetchComments]);

  return (
    <View className='page-container'>
      <CommentList
        comments={comments}
        loading={loading}
        error={error}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
        onRetry={handleRetry}
        onSubmitComment={handleSubmit}
        onDeleteComment={handleDelete}
        onReplyClick={handleReplyClick}
        rateLimitCooldown={cooldownSeconds}
      />
      <CommentInput
        onSubmit={handleSubmit}
        replyTo={replyTo}
        onCancelReply={handleCancelReply}
        cooldownSeconds={cooldownSeconds}
        submitting={submitting}
      />
    </View>
  );
}
