// Reader-site data facade — Content service (anonymous discovery endpoints).
//
// The reader pages call this, never contentApi directly, so the mapping is in
// one place and the pages render the same shape regardless of endpoint.

import { contentApi } from "@/services/api/contentApi";

// ---- backend shapes (see Content.Application/Dtos) ----------------------

interface StorySummaryDto {
  id: string;
  title: string;
  slug: string;
  coverImageUrl: string | null;
  status: string;
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
  contentType: string;
  language: string;
  ageRating: string;
  followCount: number;
  authorProfileId: number;
  guestAuthorName: string | null;
  createdAt: string;
  genres: StoryGenreDto[];
  tags: string[];
}

interface ChapterSummaryDto {
  id: string;
  title: string;
  orderIndex: number;
  wordCount: number;
  status: string;
  viewCount: number;
  publishedAt: string | null;
}

interface ChapterDetailDto extends ChapterSummaryDto {
  storyId: string;
  content: string;
  createdAt: string;
}

interface Paged<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

// ---- reader-facing shapes ----------------------------------------------

export interface ReaderStory {
  id?: string;
  slug: string;
  title: string;
  description: string;
  kicker: string;
  reads: string;
  ratingLabel: string;
  letter: string;
}

export interface ReaderChapter {
  id: string;
  title: string;
  order: number;
  wordCount: number;
}

export interface ReaderGenreChip {
  name: string;
  slug: string;
  isPrimary: boolean;
}

export interface ReaderStoryDetail extends ReaderStory {
  id: string;
  status: string;
  authorProfileId: number | null;
  guestAuthorName: string | null;
  genres: ReaderGenreChip[];
  tags: string[];
  chapters: ReaderChapter[];
}

export interface ReaderChapterContent {
  id: string;
  storySlug: string;
  title: string;
  order: number;
  html: string;
}

export interface TrendingItem {
  slug: string;
  title: string;
  reads: string;
}

// ---- helpers ----------------------------------------------------------

const vi = new Intl.NumberFormat("vi-VN");
const readsLabel = (n: number) => `${vi.format(n)} lượt đọc`;
const ratingLabel = (avg: number, count: number) =>
  count > 0 ? `${avg.toFixed(1)} ★` : "Chưa có đánh giá";

function summaryToReader(dto: StorySummaryDto): ReaderStory {
  return {
    id: dto.id,
    slug: dto.slug,
    title: dto.title,
    description: "",
    kicker: dto.primaryGenre || "Truyện",
    reads: readsLabel(dto.viewCount),
    ratingLabel: ratingLabel(dto.ratingAvg, dto.ratingCount),
    letter: (dto.title.trim()[0] || "•").toUpperCase(),
  };
}

// ---- API -------------------------------------------------------------

export type StorySort = "publishedAt" | "viewCount" | "ratingAvg";

export interface GenreOption {
  name: string;
  slug: string;
}

// Real active genres from the Content service. Empty array on failure.
export async function listGenres(): Promise<GenreOption[]> {
  try {
    const rows =
      await contentApi.client.get<
        { name: string; slug: string; displayOrder: number; isActive: boolean }[]
      >("/v1/genres");
    return (rows ?? [])
      .filter((g) => g.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((g) => ({ name: g.name, slug: g.slug }));
  } catch {
    return [];
  }
}

export interface BrowseOptions {
  genreSlug?: string;
  status?: string;
  authorProfileId?: string | number;
  sort?: StorySort;
  direction?: "asc" | "desc";
  pageNumber?: number;
  pageSize?: number;
}

export interface BrowseResult {
  items: ReaderStory[];
  totalCount: number;
  totalPages: number;
  pageNumber: number;
}

// Paged discovery listing for the Browse page / author profile. Returns an
// empty page when the backend is unreachable.
export async function browseStories(opts: BrowseOptions = {}): Promise<BrowseResult> {
  const pageNumber = opts.pageNumber ?? 1;
  const pageSize = opts.pageSize ?? 24;
  try {
    const paged = await contentApi.client.get<Paged<StorySummaryDto>>("/v1/stories", {
      params: {
        "genre-slug": opts.genreSlug,
        status: opts.status,
        "author-profile-id": opts.authorProfileId,
        "sort-by": opts.sort ?? "publishedAt",
        "sort-direction": opts.direction ?? "desc",
        "page-number": pageNumber,
        "page-size": pageSize,
      },
    });
    return {
      items: (paged.items ?? []).map(summaryToReader),
      totalCount: paged.totalCount ?? 0,
      totalPages: paged.totalPages ?? 1,
      pageNumber: paged.pageNumber ?? pageNumber,
    };
  } catch {
    return { items: [], totalCount: 0, totalPages: 1, pageNumber: 1 };
  }
}

export interface ListStoriesOptions {
  sort?: StorySort;
  genreSlug?: string;
  pageSize?: number;
}

export async function listStories({
  sort = "publishedAt",
  genreSlug,
  pageSize = 12,
}: ListStoriesOptions = {}): Promise<ReaderStory[]> {
  try {
    const paged = await contentApi.client.get<Paged<StorySummaryDto>>("/v1/stories", {
      params: {
        "sort-by": sort,
        "sort-direction": "desc",
        "genre-slug": genreSlug,
        "page-size": pageSize,
      },
    });
    return paged?.items?.length ? paged.items.map(summaryToReader) : [];
  } catch {
    return [];
  }
}

export async function trendingStories(limit = 5): Promise<TrendingItem[]> {
  try {
    const paged = await contentApi.client.get<Paged<StorySummaryDto>>("/v1/stories", {
      params: { "sort-by": "viewCount", "sort-direction": "desc", "page-size": limit },
    });
    return (paged?.items ?? []).map((s) => ({
      slug: s.slug,
      title: s.title,
      reads: readsLabel(s.viewCount),
    }));
  } catch {
    return [];
  }
}

export async function getStoryDetail(slug: string): Promise<ReaderStoryDetail | null> {
  try {
    const dto = await contentApi.client.get<StoryDetailDto>(
      `/v1/stories/by-slug/${encodeURIComponent(slug)}`,
    );
    const chapters = await contentApi.client
      .get<{ items?: ChapterSummaryDto[] } | ChapterSummaryDto[]>(`/v1/stories/${dto.id}/chapters`)
      .then((r) => (Array.isArray(r) ? r : (r.items ?? [])))
      .catch(() => [] as ChapterSummaryDto[]);

    const published = chapters
      .filter((c) => c.status === "Published")
      .sort((a, b) => a.orderIndex - b.orderIndex);

    return {
      ...summaryToReader(dto),
      id: dto.id,
      description: dto.description ?? "",
      status: dto.status,
      authorProfileId: dto.authorProfileId ?? null,
      guestAuthorName: dto.guestAuthorName ?? null,
      genres: [...(dto.genres ?? [])]
        .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))
        .map((g) => ({ name: g.name, slug: g.slug, isPrimary: g.isPrimary })),
      tags: dto.tags ?? [],
      chapters: published.map((c) => ({
        id: c.id,
        title: c.title,
        order: Number(c.orderIndex),
        wordCount: c.wordCount,
      })),
    };
  } catch {
    return null;
  }
}

export async function getChapterContent(
  storySlug: string,
  chapterId: string,
): Promise<ReaderChapterContent | null> {
  try {
    const dto = await contentApi.client.get<ChapterDetailDto>(
      `/v1/chapters/${encodeURIComponent(chapterId)}`,
    );
    const html = dto.content
      .split(/\n{2,}/)
      .map((p) => `<p>${p.trim().replace(/\n/g, "<br/>")}</p>`)
      .join("");
    return {
      id: dto.id,
      storySlug,
      title: dto.title,
      order: Number(dto.orderIndex),
      html,
    };
  } catch {
    return null;
  }
}
