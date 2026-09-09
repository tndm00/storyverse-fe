// Reader-site data facade.
//   useRealApi -> Content service (anonymous discovery endpoints)
//   otherwise / on network failure -> the hardcoded seed in homeData.ts + siteContent.ts
//
// The reader pages call this, never contentApi directly, so the fallback is in
// one place and the pages render the same shape regardless of source.

import { contentApi } from "@/services/api/contentApi";
import { useRealApi } from "@/services/dataSource";
import type { StoryCard, TrendingItem } from "./homeData";
import { EDITIONS, TRENDING } from "./homeData";
import { FEATURED_PICKS, SPOTLIGHT, TOPICS } from "./siteContent";

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

export interface ReaderStoryDetail extends ReaderStory {
  id: string;
  status: string;
  authorProfileId: number | null;
  guestAuthorName: string | null;
  genres: string[];
  chapters: ReaderChapter[];
}

export interface ReaderChapterContent {
  id: string;
  storySlug: string;
  title: string;
  order: number;
  html: string;
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

function cardToReader(card: StoryCard): ReaderStory {
  return {
    slug: card.slug,
    title: card.title,
    description: card.excerpt ?? "",
    kicker: card.kicker,
    reads: card.reads,
    ratingLabel: card.readTime,
    letter: card.letter,
  };
}

// Every story mentioned in the hardcoded seed, de-duped by slug — the fallback pool.
function seedStories(): ReaderStory[] {
  const cards: StoryCard[] = [
    ...EDITIONS.flatMap((e) => [e.feature, ...e.side]),
    ...FEATURED_PICKS,
    {
      slug: SPOTLIGHT.slug,
      letter: SPOTLIGHT.letter,
      kicker: SPOTLIGHT.kicker,
      title: SPOTLIGHT.title,
      readTime: "",
      reads: "—",
      excerpt: SPOTLIGHT.excerpt,
    },
  ];
  const bySlug = new Map<string, ReaderStory>();
  for (const c of cards) if (!bySlug.has(c.slug)) bySlug.set(c.slug, cardToReader(c));
  return [...bySlug.values()];
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

// Paged discovery listing for the Browse page / author profile. Real API only —
// returns an empty page (not seed data) when the backend is unreachable.
export async function browseStories(opts: BrowseOptions = {}): Promise<BrowseResult> {
  const pageNumber = opts.pageNumber ?? 1;
  const pageSize = opts.pageSize ?? 24;
  if (!useRealApi) {
    const pool = seedStories().slice(0, pageSize);
    return { items: pool, totalCount: pool.length, totalPages: 1, pageNumber: 1 };
  }
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
  if (useRealApi) {
    try {
      const paged = await contentApi.client.get<Paged<StorySummaryDto>>("/v1/stories", {
        params: {
          "sort-by": sort,
          "sort-direction": "desc",
          "genre-slug": genreSlug,
          "page-size": pageSize,
        },
      });
      if (paged?.items?.length) return paged.items.map(summaryToReader);
    } catch {
      // fall through to seed
    }
  }
  let pool = seedStories();
  if (genreSlug) {
    const topic = TOPICS.find((t) => t.key === genreSlug);
    const titles = new Set(topic?.stories.map((s) => s.title));
    pool = pool.filter((s) => titles.has(s.title));
    if (pool.length === 0 && topic) {
      pool = topic.stories.map((s) => ({
        slug: s.slug,
        title: s.title,
        description: "",
        kicker: topic.name,
        reads: s.reads,
        ratingLabel: "",
        letter: s.title.trim()[0]?.toUpperCase() ?? "•",
      }));
    }
  }
  return pool.slice(0, pageSize);
}

export async function trendingStories(limit = 5): Promise<TrendingItem[]> {
  if (useRealApi) {
    try {
      const paged = await contentApi.client.get<Paged<StorySummaryDto>>("/v1/stories", {
        params: { "sort-by": "viewCount", "sort-direction": "desc", "page-size": limit },
      });
      if (paged?.items?.length) {
        return paged.items.map((s) => ({
          slug: s.slug,
          title: s.title,
          reads: readsLabel(s.viewCount),
        }));
      }
    } catch {
      // fall through
    }
  }
  return TRENDING.slice(0, limit);
}

export async function getStoryDetail(slug: string): Promise<ReaderStoryDetail | null> {
  if (useRealApi) {
    try {
      const dto = await contentApi.client.get<StoryDetailDto>(
        `/v1/stories/by-slug/${encodeURIComponent(slug)}`,
      );
      const chapters = await contentApi.client
        .get<{ items?: ChapterSummaryDto[] } | ChapterSummaryDto[]>(
          `/v1/stories/${dto.id}/chapters`,
        )
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
        genres: (dto.genres ?? []).map((g) => g.name),
        chapters: published.map((c) => ({
          id: c.id,
          title: c.title,
          order: Number(c.orderIndex),
          wordCount: c.wordCount,
        })),
      };
    } catch {
      // fall through
    }
  }

  const seed = seedStories().find((s) => s.slug === slug);
  if (!seed) return null;
  return {
    ...seed,
    id: slug,
    status: "Ongoing",
    authorProfileId: null,
    guestAuthorName: null,
    genres: [seed.kicker],
    chapters: [],
  };
}

export async function getChapterContent(
  storySlug: string,
  chapterId: string,
): Promise<ReaderChapterContent | null> {
  if (!useRealApi) return null;
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
