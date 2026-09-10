// Community facade — chapter comments, story ratings, weekly votes.
// Backed by the Community service.
//
// The backend returns only numeric user ids (no display names, no batch lookup),
// so `authorLabel` is the caller's own display name for their rows and
// "Người đọc #<id>" for everyone else. Pages pass `currentUserId` in — the facade
// stays out of React context.

import { communityApi } from "@/services/api/communityApi";
import { notificationApi } from "@/services/api/notificationApi";
import { ApiError } from "@/services/api/client";

// ---- backend DTOs --------------------------------------------------------

interface CommentDto {
  id: string;
  chapterId: string;
  parentCommentId: string | null;
  authorUserId: number;
  authorDisplayName: string | null;
  content: string;
  status: "Visible" | "Hidden" | "Deleted";
  likeCount: number;
  createdAt: string;
  updatedAt: string | null;
}

interface RatingDto {
  id: string;
  storyId: string;
  userId: number;
  userDisplayName: string | null;
  score: number;
  reviewText: string | null;
  createdAt: string;
  updatedAt: string | null;
}

interface Paged<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

interface VoteCountDto {
  storyId: string;
  weekKey: string;
  weekVoteCount: number;
  periodStartUtc?: string | null;
  periodEndUtc?: string | null;
}

interface VotePeriodDto {
  weekKey: string;
  periodStartUtc: string;
  periodEndUtc: string;
}

interface CastVoteDto extends VoteCountDto {
  recorded: boolean;
}

// ---- facade shapes ----------------------------------------------------

export interface CommentNode {
  id: string;
  parentId: string | null;
  authorUserId: number;
  authorLabel: string;
  content: string;
  status: string;
  likeCount: number;
  createdAt: string;
  updatedAt: string | null;
  mine: boolean;
  replies: CommentNode[];
}

export interface CommentPage {
  roots: CommentNode[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export interface MyRating {
  id: string;
  score: number;
  reviewText: string;
  updatedAt: string | null;
}

export interface RatingRow {
  id: string;
  userId: number;
  authorLabel: string;
  score: number;
  reviewText: string;
  createdAt: string;
}

export interface VoteCount {
  weekKey: string;
  weekVoteCount: number;
  /** ISO instant when the current weekly voting period resets (Mon 00:00 UTC). */
  periodEndUtc: string | null;
}

export interface VotePeriod {
  weekKey: string;
  periodStartUtc: string;
  periodEndUtc: string;
}

export interface CastVoteResult extends VoteCount {
  recorded: boolean;
}

// ---- helpers --------------------------------------------------------

function labelFor(
  userId: number,
  currentUserId: number | null,
  currentUserName?: string,
  displayName?: string | null,
): string {
  if (currentUserId != null && userId === currentUserId) {
    return (currentUserName || displayName) ? `${currentUserName || displayName} (bạn)` : "Bạn";
  }
  return displayName ?? `Người đọc #${userId}`;
}

function toNode(
  dto: CommentDto,
  currentUserId: number | null,
  currentUserName?: string,
): CommentNode {
  return {
    id: dto.id,
    parentId: dto.parentCommentId,
    authorUserId: dto.authorUserId,
    authorLabel: labelFor(dto.authorUserId, currentUserId, currentUserName, dto.authorDisplayName),
    content: dto.content,
    status: dto.status,
    likeCount: dto.likeCount,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    mine: currentUserId != null && dto.authorUserId === currentUserId,
    replies: [],
  };
}

// ---- comments ------------------------------------------------------

export async function listChapterComments(
  chapterId: string,
  currentUserId: number | null,
  opts: { pageNumber?: number; pageSize?: number; currentUserName?: string } = {},
): Promise<CommentPage> {
  const paged = await communityApi.client.get<Paged<CommentDto>>("/v1/comments", {
    params: {
      "chapter-id": chapterId,
      "page-number": opts.pageNumber ?? 1,
      "page-size": opts.pageSize ?? 20,
    },
  });

  const nodes = (paged.items ?? []).map((d) => toNode(d, currentUserId, opts.currentUserName));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const roots: CommentNode[] = [];
  for (const n of nodes) {
    if (n.parentId && byId.has(n.parentId)) byId.get(n.parentId)!.replies.push(n);
    else roots.push(n);
  }
  return {
    roots,
    totalCount: paged.totalCount ?? nodes.length,
    pageNumber: paged.pageNumber ?? 1,
    pageSize: paged.pageSize ?? 20,
  };
}

export async function addComment(chapterId: string, content: string): Promise<void> {
  await communityApi.client.post("/v1/comments", { chapterId, content: content.trim() });
}

export async function replyToComment(
  parentId: string,
  content: string,
  parentAuthorUserId?: number,
  currentUserId?: number | null,
  chapterId?: string,
): Promise<void> {
  await communityApi.client.post(`/v1/comments/${parentId}/replies`, { content: content.trim() });

  // Dev stand-in for the missing "CommentReplied" event consumer: notify the
  // parent's author so the notification bell has something real to show.
  // refType/refId point at the *chapter* (not the comment — there's no
  // get-comment-by-id endpoint to resolve back to a chapter/story from a
  // comment id) so the bell can navigate straight to it.
  if (parentAuthorUserId != null && currentUserId != null && parentAuthorUserId !== currentUserId) {
    try {
      await notificationApi.createNotification({
        userId: parentAuthorUserId,
        type: "CommentReply",
        title: "Có người trả lời bình luận của bạn",
        body: content.trim().slice(0, 140),
        refType: chapterId ? "Chapter" : undefined,
        refId: chapterId,
      });
    } catch {
      /* best-effort */
    }
  }
}

export async function editComment(commentId: string, content: string): Promise<void> {
  await communityApi.client.put(`/v1/comments/${commentId}`, { content: content.trim() });
}

export async function deleteComment(commentId: string): Promise<void> {
  await communityApi.client.del(`/v1/comments/${commentId}`);
}

// ---- ratings ------------------------------------------------------

export async function getMyRating(storyId: string): Promise<MyRating | null> {
  try {
    const dto = await communityApi.client.get<RatingDto>("/v1/ratings/mine", {
      params: { "story-id": storyId },
    });
    return {
      id: dto.id,
      score: dto.score,
      reviewText: dto.reviewText ?? "",
      updatedAt: dto.updatedAt,
    };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function listStoryRatings(
  storyId: string,
  currentUserId: number | null,
  opts: { pageNumber?: number; pageSize?: number } = {},
): Promise<{ items: RatingRow[]; totalCount: number }> {
  const paged = await communityApi.client.get<Paged<RatingDto>>("/v1/ratings", {
    params: {
      "story-id": storyId,
      "page-number": opts.pageNumber ?? 1,
      "page-size": opts.pageSize ?? 10,
    },
  });
  return {
    items: (paged.items ?? []).map((d) => ({
      id: d.id,
      userId: d.userId,
      authorLabel: labelFor(d.userId, currentUserId, undefined, d.userDisplayName),
      score: d.score,
      reviewText: d.reviewText ?? "",
      createdAt: d.createdAt,
    })),
    totalCount: paged.totalCount ?? 0,
  };
}

export async function rateStory(
  storyId: string,
  score: number,
  reviewText: string,
): Promise<MyRating> {
  const dto = await communityApi.client.put<RatingDto>("/v1/ratings", {
    storyId,
    score,
    reviewText: reviewText.trim(),
  });
  return {
    id: dto.id,
    score: dto.score,
    reviewText: dto.reviewText ?? "",
    updatedAt: dto.updatedAt,
  };
}

// ---- votes ------------------------------------------------------

export async function getVoteCount(storyId: string): Promise<VoteCount> {
  const dto = await communityApi.client.get<VoteCountDto>("/v1/votes/count", {
    params: { "story-id": storyId },
  });
  return {
    weekKey: dto.weekKey,
    weekVoteCount: dto.weekVoteCount,
    periodEndUtc: dto.periodEndUtc ?? null,
  };
}

export async function castVote(storyId: string): Promise<CastVoteResult> {
  const dto = await communityApi.client.post<CastVoteDto>("/v1/votes", { storyId });
  return {
    weekKey: dto.weekKey,
    weekVoteCount: dto.weekVoteCount,
    periodEndUtc: dto.periodEndUtc ?? null,
    recorded: dto.recorded,
  };
}

// Current weekly voting window. Used as a fallback for the reset countdown when
// the vote-count response predates the periodEndUtc field.
export async function getCurrentVotePeriod(): Promise<VotePeriod | null> {
  try {
    const dto = await communityApi.client.get<VotePeriodDto>("/v1/votes/current-period");
    return {
      weekKey: dto.weekKey,
      periodStartUtc: dto.periodStartUtc,
      periodEndUtc: dto.periodEndUtc,
    };
  } catch {
    return null;
  }
}
