// Pre-publication review queue facade (mock-backed).
// FE-proposed workflow — backend has no matching endpoints yet.

import dayjs from "dayjs";
import { reviewItems, findStory, findChapter } from "./mock/db";
import { withLatency, failWithLatency, paginate } from "./mock/latency";
import { DEFAULT_PAGE_SIZE, MESSAGES } from "@/utils/constants";
import type { ReviewStatus } from "@/utils/constants";
import type { Paged, ReviewItem, ReviewItemDetail } from "@/types/domain";

export interface ReviewQueueParams {
  pageNumber?: number;
  pageSize?: number;
  status?: ReviewStatus | "all";
  q?: string;
  type?: "Story" | "Chapter" | "all";
}

export type ReviewCounts = Record<ReviewStatus, number> & { total: number };

const byDateDesc = (a: { submittedAt: string }, b: { submittedAt: string }) =>
  new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();

export function listQueue({
  pageNumber = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  status = "Pending",
  q = "",
  type = "all",
}: ReviewQueueParams = {}): Promise<Paged<ReviewItem>> {
  let rows = [...reviewItems].sort(byDateDesc);

  if (status !== "all") rows = rows.filter((r) => r.reviewStatus === status);
  if (type !== "all") rows = rows.filter((r) => r.targetType === type);
  if (q) {
    const needle = q.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.title.toLowerCase().includes(needle) ||
        (r.authorName ?? "").toLowerCase().includes(needle),
    );
  }
  return withLatency(paginate(rows, pageNumber, pageSize));
}

export function counts(): Promise<ReviewCounts> {
  const by = (s: ReviewStatus) => reviewItems.filter((r) => r.reviewStatus === s).length;
  return withLatency({
    Pending: by("Pending"),
    Reviewing: by("Reviewing"),
    Approved: by("Approved"),
    Rejected: by("Rejected"),
    total: reviewItems.length,
  });
}

export function get(reviewId: string): Promise<ReviewItemDetail> {
  const item = reviewItems.find((r) => r.id === reviewId);
  if (!item) return failWithLatency<ReviewItemDetail>(MESSAGES.review.notFound);
  const target =
    item.targetType === "Story" ? findStory(item.targetPublicId) : findChapter(item.targetPublicId);
  return withLatency({ ...item, target });
}

function pushHistory(item: ReviewItem, action: string, note?: string) {
  item.history = [
    ...item.history,
    { at: dayjs().toISOString(), actor: "Platform Admin", action, note: note ?? null },
  ];
}

export function startReview(reviewId: string): Promise<ReviewItem> {
  const item = reviewItems.find((r) => r.id === reviewId);
  if (!item) return failWithLatency<ReviewItem>(MESSAGES.review.notFound);
  if (item.reviewStatus !== "Pending") {
    return failWithLatency<ReviewItem>(MESSAGES.review.onlyPendingCanStart);
  }
  item.reviewStatus = "Reviewing";
  item.assignedTo = "Platform Admin";
  pushHistory(item, "Started review");
  return withLatency({ ...item });
}

export function approve(reviewId: string, note?: string): Promise<ReviewItem> {
  const item = reviewItems.find((r) => r.id === reviewId);
  if (!item) return failWithLatency<ReviewItem>(MESSAGES.review.notFound);
  item.reviewStatus = "Approved";
  item.decisionReason = note ?? "Meets content guidelines.";
  pushHistory(item, "Approved & published", item.decisionReason);
  return withLatency({ ...item });
}

export function reject(reviewId: string, reason: string): Promise<ReviewItem> {
  const item = reviewItems.find((r) => r.id === reviewId);
  if (!item) return failWithLatency<ReviewItem>(MESSAGES.review.notFound);
  if (!reason) return failWithLatency<ReviewItem>(MESSAGES.review.reasonRequired);
  item.reviewStatus = "Rejected";
  item.decisionReason = reason;
  pushHistory(item, "Rejected", reason);
  return withLatency({ ...item });
}
