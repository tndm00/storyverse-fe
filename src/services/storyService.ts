// Stories management facade — Content service admin endpoints (Batch 1):
//   GET /v1/stories/admin         — every status, incl. Draft
//   GET /v1/stories/admin/counts  — { total, byStatus }
//   GET /v1/stories/{id}          — full detail (admin can read unpublished)
//
// Used only by the admin console (StoriesPage, DashboardPage).

import { contentApi } from "./api/contentApi";
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

interface StoryGenreDto {
  name: string;
  slug: string;
  isPrimary: boolean;
}

interface StoryDetailDto extends StorySummaryDto {
  description: string | null;
  language: string;
  followCount: number;
  guestAuthorName: string | null;
  createdAt: string;
  genres: StoryGenreDto[];
  tags: string[];
}

interface PagedDto<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

interface AdminCountsDto {
  total: number;
  byStatus: Partial<Record<StoryStatus, number>>;
}

// primary genre first, then the rest — display order for a genre list.
function orderedGenreNames(genres: StoryGenreDto[]): string[] {
  return [...genres]
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))
    .map((g) => g.name);
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

function detailToStory(dto: StoryDetailDto): Story {
  return {
    ...summaryToStory(dto),
    description: dto.description ?? "",
    authorName: dto.guestAuthorName ?? "",
    language: dto.language ?? "vi",
    followCount: dto.followCount ?? 0,
    genres: dto.genres?.length ? orderedGenreNames(dto.genres) : summaryToStory(dto).genres,
    tags: dto.tags ?? [],
    createdAt: dto.createdAt ?? dto.publishedAt ?? new Date().toISOString(),
  };
}

export type StorySortField = "publishedAt" | "title" | "viewCount" | "ratingAvg";

export interface StoryListParams {
  pageNumber?: number;
  pageSize?: number;
  status?: StoryStatus | "all";
  q?: string;
  genreSlug?: string;
  authorProfileId?: string | number;
  sortBy?: StorySortField;
  sortDir?: "asc" | "desc";
}

export type StoryCounts = Record<StoryStatus, number> & { total: number };

export async function listStories(p: StoryListParams = {}): Promise<Paged<Story>> {
  const pageNumber = p.pageNumber ?? 1;
  const pageSize = p.pageSize ?? DEFAULT_PAGE_SIZE;
  const paged = await contentApi.client.get<PagedDto<StorySummaryDto>>("/v1/stories/admin", {
    params: {
      "page-number": pageNumber,
      "page-size": pageSize,
      status: p.status && p.status !== "all" ? p.status : undefined,
      "genre-slug": p.genreSlug,
      "author-profile-id": p.authorProfileId,
      q: p.q || undefined,
      "sort-by": p.sortBy ?? "publishedAt",
      "sort-direction": p.sortDir ?? "desc",
    },
  });
  return {
    items: paged.items.map(summaryToStory),
    pageNumber: paged.pageNumber,
    pageSize: paged.pageSize,
    totalCount: paged.totalCount,
    totalPages: paged.totalPages,
  };
}

export async function counts(): Promise<StoryCounts> {
  const dto = await contentApi.client.get<AdminCountsDto>("/v1/stories/admin/counts");
  const zero = Object.fromEntries(STORY_STATUS.map((s) => [s, 0])) as Record<StoryStatus, number>;
  for (const s of STORY_STATUS) zero[s] = dto.byStatus?.[s] ?? 0;
  return { ...zero, total: dto.total ?? 0 };
}

export async function get(publicId: string): Promise<Story> {
  const dto = await contentApi.client.get<StoryDetailDto>(`/v1/stories/${publicId}`);
  return detailToStory(dto);
}

// Permanently deletes a Draft story (admin content.moderate). The backend
// rejects with a business-rule error (422/400) if status != Draft.
export async function deleteStory(publicId: string): Promise<void> {
  await contentApi.client.del(`/v1/stories/${publicId}`);
}
