// Stories management facade.
//   DATA_SOURCE=mock -> src/services/mock/db.ts
//   DATA_SOURCE=api  -> Content service GET /v1/stories
// Note: the public listing is published-only (Draft is never returned) and the
// backend has no counts or get-by-id endpoint yet, so in api mode Draft counts
// read 0 and `get()` is unavailable.

import { stories, findStory } from "./mock/db";
import { withLatency, failWithLatency, paginate } from "./mock/latency";
import { useRealApi } from "./dataSource";
import { contentApi } from "./api/contentApi";
import { ApiError } from "./api/client";
import { DEFAULT_PAGE_SIZE, MESSAGES, STORY_STATUS } from "@/utils/constants";
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

const SORTABLE: Record<StorySortField, (s: Story) => number | string> = {
  publishedAt: (s) => new Date(s.publishedAt ?? 0).getTime(),
  title: (s) => s.title.toLowerCase(),
  viewCount: (s) => s.viewCount,
  ratingAvg: (s) => s.ratingAvg,
};

async function listStoriesApi(p: StoryListParams): Promise<Paged<Story>> {
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

export function listStories(params: StoryListParams = {}): Promise<Paged<Story>> {
  return useRealApi ? listStoriesApi(params) : listStoriesMock(params);
}

function listStoriesMock({
  pageNumber = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  status = "all",
  q = "",
  sortBy = "publishedAt",
  sortDir = "desc",
}: StoryListParams = {}): Promise<Paged<Story>> {
  let rows = [...stories];

  if (status !== "all") rows = rows.filter((s) => s.status === status);
  if (q) {
    const needle = q.toLowerCase();
    rows = rows.filter(
      (s) => s.title.toLowerCase().includes(needle) || s.authorName.toLowerCase().includes(needle),
    );
  }

  const keyFn = SORTABLE[sortBy] ?? SORTABLE.publishedAt;
  rows.sort((a, b) => {
    const av = keyFn(a);
    const bv = keyFn(b);
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  return withLatency(paginate(rows, pageNumber, pageSize));
}

async function countsApi(): Promise<StoryCounts> {
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

export function counts(): Promise<StoryCounts> {
  if (useRealApi) return countsApi();
  const by = (s: StoryStatus) => stories.filter((x) => x.status === s).length;
  return withLatency({
    total: stories.length,
    Draft: by("Draft"),
    Ongoing: by("Ongoing"),
    Completed: by("Completed"),
    Hiatus: by("Hiatus"),
    Dropped: by("Dropped"),
  });
}

export function get(publicId: string): Promise<Story> {
  if (useRealApi) {
    // Content service exposes only get-by-slug; admin get-by-id is not built yet.
    return Promise.reject(
      new ApiError("Xem chi tiết truyện qua API chưa được hỗ trợ (thiếu GET /v1/stories/{id}).", {
        code: "not_implemented",
      }),
    );
  }
  const story = findStory(publicId);
  if (!story) return failWithLatency<Story>(MESSAGES.story.notFound);
  return withLatency({ ...story });
}
