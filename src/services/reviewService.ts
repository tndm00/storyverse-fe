// Pre-publication review queue facade — Content service's real moderation
// endpoints (GET /v1/chapters/pending-review, /{id}/for-review, /review,
// /approve, /reject).
//
// This is chapter-only — a story goes public the moment its first chapter is
// approved.
//
// Batch 1 wired the remaining pieces:
//   GET /v1/chapters/review-counts               — { pending, inReview, approved, rejected }
//   GET /v1/chapters/reviewed?status=Approved|Rejected — decided chapters (paged, q, type)
//   GET /v1/chapters/pending-review             — now also accepts q + type
// The queue is still chapter-only, so `type=Story` returns nothing.

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

function toReviewItem(d: PendingReviewChapterDto, statusOverride?: ReviewStatus): ReviewItem {
  const reviewStatus = statusOverride ?? BACKEND_TO_REVIEW_STATUS[d.status] ?? "Pending";
  return {
    id: d.chapterId,
    targetType: "Chapter",
    targetPublicId: d.chapterId,
    title: d.chapterTitle,
    authorName: d.guestAuthorName ?? undefined,
    genres: [],
    submittedAt: d.createdAt,
    reviewStatus,
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
  q,
  type,
}: ReviewQueueParams = {}): Promise<Paged<ReviewItem>> {
  const typeParam = type && type !== "all" ? type : undefined;
  const decided = status === "Approved" || status === "Rejected";

  const paged = decided
    ? await contentApi.client.get<PagedDto<PendingReviewChapterDto>>("/v1/chapters/reviewed", {
        params: {
          status,
          q: q || undefined,
          type: typeParam,
          "page-number": pageNumber,
          "page-size": pageSize,
        },
      })
    : await contentApi.client.get<PagedDto<PendingReviewChapterDto>>("/v1/chapters/pending-review", {
        params: {
          status:
            status === "all" ? undefined : REVIEW_STATUS_TO_BACKEND[status as string] ?? undefined,
          q: q || undefined,
          type: typeParam,
          "page-number": pageNumber,
          "page-size": pageSize,
        },
      });

  const override: ReviewStatus | undefined = decided
    ? (status as ReviewStatus)
    : undefined;

  return {
    items: paged.items.map((d) => toReviewItem(d, override)),
    pageNumber: paged.pageNumber,
    pageSize: paged.pageSize,
    totalCount: paged.totalCount,
    totalPages: paged.totalPages,
  };
}

interface ReviewCountsDto {
  pending: number;
  inReview: number;
  approved: number;
  rejected: number;
}

export async function counts(): Promise<ReviewCounts> {
  const dto = await contentApi.client.get<ReviewCountsDto>("/v1/chapters/review-counts");
  return {
    Pending: dto.pending ?? 0,
    Reviewing: dto.inReview ?? 0,
    Approved: dto.approved ?? 0,
    Rejected: dto.rejected ?? 0,
    total: (dto.pending ?? 0) + (dto.inReview ?? 0) + (dto.approved ?? 0) + (dto.rejected ?? 0),
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

// ---- rejected queue (dedicated admin page) --------------------------
//
// GET /v1/chapters/reviewed?status=Rejected returns PendingReviewChapterDto
// rows, which carry no rejection reason or decision timestamp — only the
// per-chapter GET /{id}/for-review detail does (rejectionReason + the
// review-action timeline). So the dedicated Rejected queue enriches each
// listed row with one detail call to surface "why" and "when" in the table.
export interface RejectedItem extends ReviewItem {
  rejectedAt: string | null;
}

export async function listRejected(
  params: Omit<ReviewQueueParams, "status"> = {},
): Promise<Paged<RejectedItem>> {
  const paged = await listQueue({ ...params, status: "Rejected" });

  const items = await Promise.all(
    paged.items.map(async (item): Promise<RejectedItem> => {
      try {
        const detail = await get(item.id);
        const rejectedAction = [...detail.history]
          .reverse()
          .find((h) => /reject/i.test(h.action));
        return {
          ...item,
          decisionReason: detail.decisionReason,
          rejectedAt: rejectedAction?.at ?? null,
        };
      } catch {
        // Detail lookup failed (e.g. chapter removed since) — still show the
        // row from the list, just without the enrichment.
        return { ...item, rejectedAt: null };
      }
    }),
  );

  return { ...paged, items };
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
