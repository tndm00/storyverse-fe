// Pre-publication review queue facade — Content service's real moderation
// endpoints (GET /v1/chapters/pending-review, /{id}/for-review, /review,
// /approve, /reject).
//
// This is chapter-only — a story goes public the moment its first chapter is
// approved.
//
// Known gaps: no aggregate counts for Approved/Rejected (no listing endpoint
// for already-decided chapters — both read 0); `q` (free-text) and `type`
// ("Story" vs "Chapter") filters are ignored (queue is chapter-only).

import { contentApi } from "./api/contentApi";
import { DEFAULT_PAGE_SIZE, MESSAGES } from "@/utils/constants";
import type { ReviewStatus } from "@/utils/constants";
import type {
  Chapter,
  HistoryEntry,
  Paged,
  ReviewItem,
  ReviewItemDetail,
} from "@/types/domain";

export interface ReviewQueueParams {
  pageNumber?: number;
  pageSize?: number;
  status?: ReviewStatus | "all";
  q?: string;
  type?: "Story" | "Chapter" | "all";
}

export type ReviewCounts = Record<ReviewStatus, number> & { total: number };

// ---- backend DTOs -----------------------------------------------------

interface PendingReviewChapterDto {
  chapterId: string;
  storyId: string;
  storySlug: string;
  storyTitle: string;
  chapterTitle: string;
  wordCount: number;
  authorProfileId: number;
  guestAuthorName: string | null;
  status: "PendingReview" | "InReview";
  createdAt: string;
}

interface ChapterReviewActionDto {
  id: string;
  moderatorUserId: number;
  action: string;
  note: string | null;
  createdAt: string;
}

interface ChapterDetailDto {
  id: string;
  storyId: string;
  volumeId: string | null;
  title: string;
  orderIndex: number;
  content: string;
  wordCount: number;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  rejectionReason: string | null;
  reviewActions?: ChapterReviewActionDto[];
}

function toHistoryEntry(a: ChapterReviewActionDto): HistoryEntry {
  return {
    at: a.createdAt,
    actor: `Moderator #${a.moderatorUserId}`,
    action: a.action,
    note: a.note ?? null,
  };
}

interface PagedDto<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

// backend ChapterStatus -> FE ReviewStatus (Pending/Reviewing only — a decided
// chapter leaves the queue, so Approved/Rejected never come back from listQueue).
const BACKEND_TO_REVIEW_STATUS: Record<string, ReviewStatus> = {
  PendingReview: "Pending",
  InReview: "Reviewing",
};
const REVIEW_STATUS_TO_BACKEND: Record<string, string> = {
  Pending: "PendingReview",
  Reviewing: "InReview",
};

function toReviewItem(d: PendingReviewChapterDto): ReviewItem {
  return {
    id: d.chapterId,
    targetType: "Chapter",
    targetPublicId: d.chapterId,
    title: d.chapterTitle,
    authorName: d.guestAuthorName ?? undefined,
    genres: [],
    submittedAt: d.createdAt,
    reviewStatus: BACKEND_TO_REVIEW_STATUS[d.status] ?? "Pending",
    assignedTo: d.status === "InReview" ? "Moderator" : null,
    decisionReason: null,
    history: [],
  };
}

function toChapter(d: ChapterDetailDto): Chapter {
  return {
    publicId: d.id,
    storyPublicId: d.storyId,
    storyTitle: "",
    title: d.title,
    orderIndex: Number(d.orderIndex),
    wordCount: d.wordCount,
    status: d.status as Chapter["status"],
    content: d.content,
    submittedAt: d.createdAt,
  };
}

// ---- admin queue ---------------------------------------------------

export async function listQueue({
  pageNumber = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  status = "Pending",
}: ReviewQueueParams = {}): Promise<Paged<ReviewItem>> {
  const backendStatus =
    status === "all" || status === "Approved" || status === "Rejected"
      ? undefined
      : REVIEW_STATUS_TO_BACKEND[status];

  const paged = await contentApi.client.get<PagedDto<PendingReviewChapterDto>>(
    "/v1/chapters/pending-review",
    { params: { status: backendStatus, "page-number": pageNumber, "page-size": pageSize } },
  );

  return {
    items: paged.items.map(toReviewItem),
    pageNumber: paged.pageNumber,
    pageSize: paged.pageSize,
    totalCount: paged.totalCount,
    totalPages: paged.totalPages,
  };
}

export async function counts(): Promise<ReviewCounts> {
  const [pending, reviewing] = await Promise.all([
    contentApi.client.get<PagedDto<PendingReviewChapterDto>>("/v1/chapters/pending-review", {
      params: { status: "PendingReview", "page-size": 1 },
    }),
    contentApi.client.get<PagedDto<PendingReviewChapterDto>>("/v1/chapters/pending-review", {
      params: { status: "InReview", "page-size": 1 },
    }),
  ]);
  // No listing endpoint for already-decided chapters — documented gap.
  return {
    Pending: pending.totalCount,
    Reviewing: reviewing.totalCount,
    Approved: 0,
    Rejected: 0,
    total: pending.totalCount + reviewing.totalCount,
  };
}

export function get(reviewId: string): Promise<ReviewItemDetail> {
  return contentApi.client
    .get<ChapterDetailDto>(`/v1/chapters/${reviewId}/for-review`)
    .then((d) => ({
      id: d.id,
      targetType: "Chapter" as const,
      targetPublicId: d.id,
      title: d.title,
      authorName: undefined,
      genres: [],
      submittedAt: d.createdAt,
      reviewStatus: BACKEND_TO_REVIEW_STATUS[d.status] ?? ("Pending" as ReviewStatus),
      assignedTo: d.status === "InReview" ? "Moderator" : null,
      decisionReason: d.rejectionReason,
      history: (d.reviewActions ?? []).map(toHistoryEntry),
      target: toChapter(d),
    }));
}

export function startReview(reviewId: string): Promise<ReviewItem> {
  return contentApi.client.post<ChapterDetailDto>(`/v1/chapters/${reviewId}/review`).then((d) =>
    toReviewItem({
      chapterId: d.id,
      storyId: d.storyId,
      storySlug: "",
      storyTitle: "",
      chapterTitle: d.title,
      wordCount: d.wordCount,
      authorProfileId: 0,
      guestAuthorName: null,
      status: "InReview",
      createdAt: d.createdAt,
    }),
  );
}

// `note` is accepted for call-site compatibility but unused — the backend
// approve endpoint takes no note.
export function approve(reviewId: string, _note?: string): Promise<ReviewItem> {
  return contentApi.client.post<ChapterDetailDto>(`/v1/chapters/${reviewId}/approve`).then((d) => ({
    id: d.id,
    targetType: "Chapter" as const,
    targetPublicId: d.id,
    title: d.title,
    authorName: undefined,
    genres: [],
    submittedAt: d.createdAt,
    reviewStatus: "Approved" as ReviewStatus,
    assignedTo: null,
    decisionReason: null,
    history: [],
  }));
}

export function reject(reviewId: string, reason: string): Promise<ReviewItem> {
  if (!reason) return Promise.reject(new Error(MESSAGES.review.reasonRequired));
  return contentApi.client
    .post<ChapterDetailDto>(`/v1/chapters/${reviewId}/reject`, { reason })
    .then((d) => ({
      id: d.id,
      targetType: "Chapter" as const,
      targetPublicId: d.id,
      title: d.title,
      authorName: undefined,
      genres: [],
      submittedAt: d.createdAt,
      reviewStatus: "Rejected" as ReviewStatus,
      assignedTo: null,
      decisionReason: d.rejectionReason,
      history: [],
    }));
}
