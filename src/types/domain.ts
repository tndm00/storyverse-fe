// Domain models shared across services, pages and components.
// The real API layer (src/services/api) maps backend DTOs onto these shapes.

import type {
  ChapterStatus,
  ModerationAction,
  ReportReason,
  ReportStatus,
  ReviewStatus,
  StoryStatus,
  TargetType,
} from "@/utils/constants";

export interface HistoryEntry {
  at: string;
  actor: string;
  action: string;
  note: string | null;
}

export interface Story {
  publicId: string;
  title: string;
  slug: string;
  description: string;
  coverImageUrl: string;
  status: StoryStatus;
  authorName: string;
  language: string;
  ageRating: "General" | "Mature";
  viewCount: number;
  followCount: number;
  ratingAvg: number;
  ratingCount: number;
  genres: string[];
  tags: string[];
  chapterCount: number;
  publishedAt: string | null;
  createdAt: string;
}

export interface Chapter {
  publicId: string;
  storyPublicId: string;
  storyTitle: string;
  title: string;
  orderIndex: number;
  wordCount: number;
  status: ChapterStatus;
  content: string;
  submittedAt: string;
}

/** Review-queue item — mapped from the Content service's pending-review chapters. */
export interface ReviewItem {
  id: string;
  targetType: Extract<TargetType, "Story" | "Chapter">;
  targetPublicId: string;
  title: string;
  authorName: string | undefined;
  genres: string[];
  submittedAt: string;
  reviewStatus: ReviewStatus;
  assignedTo: string | null;
  decisionReason: string | null;
  history: HistoryEntry[];
}

export interface ReviewItemDetail extends ReviewItem {
  target: Story | Chapter | null;
}

export interface Report {
  id: string;
  targetType: TargetType;
  targetRef: { id: string; title: string };
  reason: ReportReason;
  reporterName: string;
  note: string;
  status: ReportStatus;
  action: ModerationAction | null;
  resolutionNote: string | null;
  createdAt: string;
  history: HistoryEntry[];
}

export interface ReportDetail extends Report {
  story: Story | null;
}

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  roles: string[];
}

/** Mirrors the backend PagedResponseDto<T>. */
export interface Paged<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
