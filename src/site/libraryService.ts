// Library facade — bookshelf entries + reading progress.
// Library service (+ Content GET /v1/stories/{id} to resolve titles).

import { libraryApi } from "@/services/api/libraryApi";
import { contentApi } from "@/services/api/contentApi";
import { ApiError } from "@/services/api/client";

export type Shelf = "Reading" | "PlanToRead" | "Completed" | "Dropped";

export const SHELVES: { value: Shelf; label: string }[] = [
  { value: "Reading", label: "Đang đọc" },
  { value: "PlanToRead", label: "Muốn đọc" },
  { value: "Completed", label: "Đã đọc xong" },
  { value: "Dropped", label: "Tạm dừng" },
];

const SHELF_LABEL: Record<string, string> = Object.fromEntries(
  SHELVES.map((s) => [s.value, s.label]),
);
export const shelfLabel = (v: string) => SHELF_LABEL[v] ?? v;

// ---- backend DTOs ----------------------------------------------------

interface LibraryEntryDto {
  id: string;
  storyId: string;
  shelfStatus: Shelf;
  addedAt: string;
  updatedAt: string | null;
}

interface ReadingProgressDto {
  id: string;
  storyId: string;
  lastChapterId: string;
  scrollPercent: number | null;
  lastReadAt: string;
}

interface Paged<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

interface StoryLite {
  id: string;
  title: string;
  slug: string;
}

// ---- facade shapes -------------------------------------------------

export interface LibraryItem {
  id: string;
  storyId: string;
  shelf: Shelf;
  addedAt: string;
  updatedAt: string | null;
  story: { title: string; slug: string } | null;
}

export type LibrarySort = "added" | "updated" | "title" | "progress";

export interface ContinueItem {
  storyId: string;
  lastChapterId: string;
  scrollPercent: number | null;
  lastReadAt: string;
  story: { title: string; slug: string } | null;
}

// ---- title resolution (Content GET /v1/stories/{id}) ---------------

async function resolveStories(
  ids: string[],
): Promise<Map<string, { title: string; slug: string }>> {
  const unique = [...new Set(ids)];
  const results = await Promise.all(
    unique.map((id) =>
      contentApi.client
        .get<StoryLite>(`/v1/stories/${id}`)
        .then((s) => [id, { title: s.title, slug: s.slug }] as const)
        .catch(() => null),
    ),
  );
  return new Map(
    results.filter((r): r is readonly [string, { title: string; slug: string }] => r !== null),
  );
}

// ---- library entries ---------------------------------------------

export async function listLibrary(
  shelf?: Shelf,
  opts: { pageNumber?: number; pageSize?: number } = {},
): Promise<{ items: LibraryItem[]; totalCount: number }> {
  const paged = await libraryApi.client.get<Paged<LibraryEntryDto>>("/v1/library", {
    params: {
      "shelf-status": shelf,
      "page-number": opts.pageNumber ?? 1,
      "page-size": opts.pageSize ?? 20,
    },
  });
  const stories = await resolveStories((paged.items ?? []).map((e) => e.storyId));
  return {
    items: (paged.items ?? []).map((e) => ({
      id: e.id,
      storyId: e.storyId,
      shelf: e.shelfStatus,
      addedAt: e.addedAt,
      updatedAt: e.updatedAt,
      story: stories.get(e.storyId) ?? null,
    })),
    totalCount: paged.totalCount ?? 0,
  };
}

// Per-shelf totals for the library tab badges. One lightweight page-size-1 call
// per shelf; failures count as 0.
export async function listShelfCounts(): Promise<Record<Shelf, number> & { all: number }> {
  const results = await Promise.all(
    SHELVES.map((s) =>
      libraryApi.client
        .get<Paged<LibraryEntryDto>>("/v1/library", {
          params: { "shelf-status": s.value, "page-number": 1, "page-size": 1 },
        })
        .then((p) => [s.value, p.totalCount ?? 0] as const)
        .catch(() => [s.value, 0] as const),
    ),
  );
  const byShelf = Object.fromEntries(results) as Record<Shelf, number>;
  return { ...byShelf, all: Object.values(byShelf).reduce((a, b) => a + b, 0) };
}

// storyId -> reading progress percent (0..100). Used only as a client-side sort
// key on the library page; stories with no tracked progress are absent.
export async function readingProgressMap(): Promise<Map<string, number>> {
  try {
    const paged = await libraryApi.client.get<Paged<ReadingProgressDto>>(
      "/v1/reading-progress/continue-reading",
      { params: { "page-number": 1, "page-size": 100 } },
    );
    return new Map((paged.items ?? []).map((e) => [e.storyId, e.scrollPercent ?? 0]));
  } catch {
    return new Map();
  }
}

// Client-side ordering for a single shelf's entries.
export function sortLibraryItems(
  items: LibraryItem[],
  sort: LibrarySort,
  progress?: Map<string, number>,
): LibraryItem[] {
  const copy = [...items];
  switch (sort) {
    case "title":
      return copy.sort((a, b) =>
        (a.story?.title ?? "").localeCompare(b.story?.title ?? "", "vi"),
      );
    case "updated":
      return copy.sort(
        (a, b) =>
          new Date(b.updatedAt ?? b.addedAt).getTime() -
          new Date(a.updatedAt ?? a.addedAt).getTime(),
      );
    case "progress":
      return copy.sort(
        (a, b) => (progress?.get(b.storyId) ?? 0) - (progress?.get(a.storyId) ?? 0),
      );
    case "added":
    default:
      return copy.sort(
        (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime(),
      );
  }
}

export async function getEntryForStory(storyId: string): Promise<LibraryItem | null> {
  // No single-entry GET — list the first page and find it.
  const paged = await libraryApi.client.get<Paged<LibraryEntryDto>>("/v1/library", {
    params: { "page-number": 1, "page-size": 200 },
  });
  const hit = (paged.items ?? []).find((e) => e.storyId === storyId);
  if (!hit) return null;
  return {
    id: hit.id,
    storyId: hit.storyId,
    shelf: hit.shelfStatus,
    addedAt: hit.addedAt,
    updatedAt: hit.updatedAt,
    story: null,
  };
}

export async function addToLibrary(storyId: string, shelf: Shelf = "Reading"): Promise<void> {
  await libraryApi.client.post("/v1/library", { storyId, shelfStatus: shelf });
}

export async function setShelf(storyId: string, shelf: Shelf): Promise<void> {
  await libraryApi.client.put(`/v1/library/${storyId}/shelf-status`, { shelfStatus: shelf });
}

export async function removeFromLibrary(storyId: string): Promise<void> {
  await libraryApi.client.del(`/v1/library/${storyId}`);
}

// ---- reading progress ------------------------------------------

export async function listContinueReading(
  opts: { pageNumber?: number; pageSize?: number } = {},
): Promise<ContinueItem[]> {
  const paged = await libraryApi.client.get<Paged<ReadingProgressDto>>(
    "/v1/reading-progress/continue-reading",
    { params: { "page-number": opts.pageNumber ?? 1, "page-size": opts.pageSize ?? 6 } },
  );
  const stories = await resolveStories((paged.items ?? []).map((e) => e.storyId));
  return (paged.items ?? []).map((e) => ({
    storyId: e.storyId,
    lastChapterId: e.lastChapterId,
    scrollPercent: e.scrollPercent,
    lastReadAt: e.lastReadAt,
    story: stories.get(e.storyId) ?? null,
  }));
}

export async function getReadingProgress(storyId: string): Promise<ReadingProgressDto | null> {
  try {
    return await libraryApi.client.get<ReadingProgressDto>(`/v1/reading-progress/${storyId}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function saveReadingProgress(
  storyId: string,
  lastChapterId: string,
  scrollPercent?: number,
): Promise<void> {
  await libraryApi.client.put(`/v1/reading-progress/${storyId}`, { lastChapterId, scrollPercent });
}
