// Admin comment-moderation facade — Community service.
//
// GET /v1/comments/admin is the platform-wide moderation feed (status/q/chapter-id/
// author-user-id filters, sort, paging) — used by the admin Comments page. The older
// per-chapter `listChapterComments` (GET /v1/comments?chapter-id=) is kept for any
// call site that still wants a single chapter's thread.
//
// Hide/unhide uses POST /v1/comments/{id}/moderation-visibility { hidden, reason }
// (community.moderate — available to Moderator + PlatformAdmin via JWT).

import { communityApi } from "./api/communityApi";

export interface AdminComment {
  id: string;
  chapterId: string;
  parentCommentId: string | null;
  authorUserId: number;
  authorLabel: string;
  content: string;
  status: "Visible" | "Hidden" | "Deleted";
  hidden: boolean;
  createdAt: string;
}

interface CommentDto {
  id: string;
  chapterId: string;
  parentCommentId: string | null;
  authorUserId: number;
  authorDisplayName: string | null;
  content: string;
  status: "Visible" | "Hidden" | "Deleted";
  createdAt: string;
}

interface PagedDto<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface AdminCommentPage {
  items: AdminComment[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

function toAdminComment(d: CommentDto): AdminComment {
  return {
    id: d.id,
    chapterId: d.chapterId,
    parentCommentId: d.parentCommentId,
    authorUserId: d.authorUserId,
    authorLabel: d.authorDisplayName ?? `Người đọc #${d.authorUserId}`,
    content: d.content,
    status: d.status,
    hidden: d.status === "Hidden",
    createdAt: d.createdAt,
  };
}

export async function listChapterComments(
  chapterId: string,
  opts: { pageNumber?: number; pageSize?: number } = {},
): Promise<AdminCommentPage> {
  const pageNumber = opts.pageNumber ?? 1;
  const pageSize = opts.pageSize ?? 20;
  const paged = await communityApi.client.get<PagedDto<CommentDto>>("/v1/comments", {
    params: {
      "chapter-id": chapterId.trim(),
      "page-number": pageNumber,
      "page-size": pageSize,
    },
  });
  return {
    items: (paged.items ?? []).map(toAdminComment),
    pageNumber: paged.pageNumber ?? pageNumber,
    pageSize: paged.pageSize ?? pageSize,
    totalCount: paged.totalCount ?? 0,
    totalPages: paged.totalPages ?? 1,
  };
}

export type AdminCommentStatusFilter = "Visible" | "Hidden" | "Deleted" | "all";

export interface ListAdminCommentsParams {
  status?: AdminCommentStatusFilter;
  q?: string;
  chapterId?: string;
  authorUserId?: number;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  pageNumber?: number;
  pageSize?: number;
}

export async function listAdmin(params: ListAdminCommentsParams = {}): Promise<AdminCommentPage> {
  const pageNumber = params.pageNumber ?? 1;
  const pageSize = params.pageSize ?? 20;
  const paged = await communityApi.client.get<PagedDto<CommentDto>>("/v1/comments/admin", {
    params: {
      status: params.status ?? "all",
      q: params.q?.trim() || undefined,
      "chapter-id": params.chapterId?.trim() || undefined,
      "author-user-id": params.authorUserId,
      "sort-by": params.sortBy,
      "sort-direction": params.sortDirection,
      "page-number": pageNumber,
      "page-size": pageSize,
    },
  });
  return {
    items: (paged.items ?? []).map(toAdminComment),
    pageNumber: paged.pageNumber ?? pageNumber,
    pageSize: paged.pageSize ?? pageSize,
    totalCount: paged.totalCount ?? 0,
    totalPages: paged.totalPages ?? 1,
  };
}

export async function setVisibility(
  commentId: string,
  hidden: boolean,
  reason: string,
): Promise<void> {
  await communityApi.client.post(`/v1/comments/${commentId}/moderation-visibility`, {
    hidden,
    reason: reason.trim(),
  });
}
