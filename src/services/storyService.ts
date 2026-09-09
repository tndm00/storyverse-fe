// Stories management facade — Content service GET /v1/stories.
// Note: the public listing is published-only (Draft is never returned) and the
// backend has no counts or get-by-id endpoint yet, so Draft counts read 0 and
// `get()` is unavailable.

import { contentApi } from "./api/contentApi";
import { ApiError } from "./api/client";
import { DEFAULT_PAGE_SIZE, STORY_STATUS } from "@/utils/constants";
import type { StoryStatus } from "@/utils/constants";
import type { Paged, Story } from "@/types/domain";

interface StorySummaryDto {
  id: string;
  title: string;
  slug: string;
  coverImageUrl: string | null;
  status: string;
  ageRating: string;
  primaryGenre: string | null;
  viewCount: number;
  ratingAvg: number;
  ratingCount: number;
  publishedAt: string | null;
}

interface PagedDto<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

function summaryToStory(dto: StorySummaryDto): Story {
  return {
    publicId: dto.id,
    title: dto.title,
    slug: dto.slug,
    description: "",
    coverImageUrl: dto.coverImageUrl ?? "",
    status: dto.status as StoryStatus,
    authorName: "",
    language: "vi",
    ageRating: dto.ageRating === "Mature" ? "Mature" : "General",
    viewCount: dto.viewCount,
    followCount: 0,
    ratingAvg: dto.ratingAvg,
    ratingCount: dto.ratingCount,
    genres: dto.primaryGenre ? [dto.primaryGenre] : [],
    tags: [],
    chapterCount: 0,
    publishedAt: dto.publishedAt,
    createdAt: dto.publishedAt ?? new Date().toISOString(),
  };
}

export type StorySortField = "publishedAt" | "title" | "viewCount" | "ratingAvg";

export interface StoryListParams {
  pageNumber?: number;
  pageSize?: number;
  status?: StoryStatus | "all";
  q?: string;
  sortBy?: StorySortField;
  sortDir?: "asc" | "desc";
}

export type StoryCounts = Record<StoryStatus, number> & { total: number };

export async function listStories(p: StoryListParams = {}): Promise<Paged<Story>> {
  const pageNumber = p.pageNumber ?? 1;
  const pageSize = p.pageSize ?? DEFAULT_PAGE_SIZE;
  const paged = await contentApi.client.get<PagedDto<StorySummaryDto>>("/v1/stories", {
    params: {
      "page-number": pageNumber,
      "page-size": pageSize,
      status: p.status && p.status !== "all" ? p.status : undefined,
      "sort-by": p.sortBy ?? "publishedAt",
      "sort-direction": p.sortDir ?? "desc",
    },
  });
  let items = paged.items.map(summaryToStory);
  if (p.q) {
    const needle = p.q.toLowerCase();
    items = items.filter((s) => s.title.toLowerCase().includes(needle));
  }
  return {
    items,
    pageNumber: paged.pageNumber,
    pageSize: paged.pageSize,
    totalCount: paged.totalCount,
    totalPages: paged.totalPages,
  };
}

export async function counts(): Promise<StoryCounts> {
  // No dedicated counts endpoint — tally one large published page client-side.
  const paged = await contentApi.client.get<PagedDto<StorySummaryDto>>("/v1/stories", {
    params: { "page-number": 1, "page-size": 200 },
  });
  const zero = Object.fromEntries(STORY_STATUS.map((s) => [s, 0])) as Record<StoryStatus, number>;
  for (const item of paged.items) {
    const s = item.status as StoryStatus;
    if (s in zero) zero[s] += 1;
  }
  return { ...zero, total: paged.totalCount };
}

export function get(_publicId: string): Promise<Story> {
  // Content service exposes only get-by-slug; admin get-by-id is not built yet.
  return Promise.reject(
    new ApiError("Xem chi tiết truyện qua API chưa được hỗ trợ (thiếu GET /v1/stories/{id}).", {
      code: "not_implemented",
    }),
  );
}
