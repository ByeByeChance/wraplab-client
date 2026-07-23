import { request, getPaginated } from './request';
import type { CommentItem , PaginatedData } from '../types';

/** 获取案例评论列表 (分页) */
export function getComments(
  caseId: string,
  params?: { page?: number; size?: number },
): Promise<PaginatedData<CommentItem>> {
  return getPaginated<CommentItem>(`/cases/${encodeURIComponent(caseId)}/comments`, {
    ...params,
    size: params?.size ?? 20,
  } as Record<string, unknown>);
}

/** 发表评论/回复 */
export function postComment(
  caseId: string,
  data: { content: string; parent_id?: string },
): Promise<CommentItem> {
  return request<CommentItem>({
    url: `/cases/${encodeURIComponent(caseId)}/comments`,
    method: 'POST',
    data,
  });
}

/** 删除评论 (管理员或作者) */
export function deleteComment(caseId: string, commentId: string): Promise<void> {
  return request<void>({
    url: `/cases/${encodeURIComponent(caseId)}/comments/${encodeURIComponent(commentId)}`,
    method: 'DELETE',
  });
}

/** 审核通过 (管理员) */
export function approveComment(commentId: string): Promise<void> {
  return request<void>({
    url: `/admin/comments/${encodeURIComponent(commentId)}/approve`,
    method: 'POST',
    data: { action: 'approve' },
  });
}

/** 审核拒绝 (管理员) */
export function rejectComment(commentId: string): Promise<void> {
  return request<void>({
    url: `/admin/comments/${encodeURIComponent(commentId)}/approve`,
    method: 'POST',
    data: { action: 'reject' },
  });
}

/** 获取待审核评论列表 (管理员) */
export function getPendingComments(
  params?: { page?: number; size?: number },
): Promise<PaginatedData<CommentItem>> {
  return getPaginated<CommentItem>('/admin/comments/pending', {
    ...params,
    size: params?.size ?? 20,
  } as Record<string, unknown>);
}

/** 评论赞 toggle */
export function voteComment(commentId: string): Promise<{ vote_count: number; is_voted: boolean }> {
  return request<{ vote_count: number; is_voted: boolean }>({
    url: `/cases/comments/${encodeURIComponent(commentId)}/vote`,
    method: 'POST',
  });
}
