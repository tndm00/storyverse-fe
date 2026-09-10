// Author workspace data facade — the "Đăng truyện" flow, backed by the Content
// service authoring endpoints + Authentication author-profile.
//
// Pages call this, never contentApi/authenticationApi directly.
//
// BACKEND GAPS (documented, worked around here):
//   - No GET /v1/stories/{id}. Owner detail is read via GET /v1/stories/by-slug/{slug}
//     (returns Draft to its owner). The workspace tracks story slugs it created in
//     localStorage["sv_author_stories"].
//   - No "list my stories" endpoint (GET /v1/stories is published-only, no author
//     filter). listMyStories() replays the tracked slug list.
//   A GET /v1/stories/mine (filter by JWT author_id, include drafts) would remove
//   the localStorage tracking.

import { contentApi } from "@/services/api/contentApi";
import { authenticationApi } from "@/services/api/authenticationApi";
import { ApiError } from "@/services/api/client";
import type { AuthorProfileResponse } from "@/services/api/types";

// ---- shared enums ----------------------------------------------------------

export type StoryContentType = "Original" | "Translated";
export type AgeRating = "General" | "Mature";
export type StoryStatus = "Draft" | "Ongoing" | "Completed" | "Hiatus" | "Dropped";
export type ChapterStatus =
  "Draft" | "Scheduled" | "PendingReview" | "InReview" | "Published" | "Rejected" | "Removed";

// Manual story-status transitions the backend allows (StoryStatusPolicy).
export const STORY_STATUS_TRANSITIONS: Record<StoryStatus, StoryStatus[]> = {
  Draft: [],
  Ongoing: ["Hiatus", "Completed", "Dropped"],
  Hiatus: ["Ongoing", "Dropped"],
  Completed: [],
  Dropped: [],
};

// ---- backend DTO shapes (Content.Application/Dtos) ------------------------

interface StoryGenreDto {
  name: string;
  slug: string;
  isPrimary: boolean;
}

interface StoryDetailDto {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  status: StoryStatus;
  contentType: StoryContentType;
  originalSource: string | null;
  language: string;
  ageRating: AgeRating;
  authorProfileId: number;
  viewCount: number;
  publishedAt: string | null;
  createdAt: string;
  genres: StoryGenreDto[];
  tags: string[];
}

interface ChapterDetailDto {
  id: string;
  storyId: string;
  volumeId: string | null;
  title: string;
  orderIndex: number;
  content: string;
  wordCount: number;
  status: ChapterStatus;
  publishedAt: string | null;
  rejectionReason: string | null;
}

interface ChapterSummaryDto {
  id: string;
  volumeId: string | null;
  title: string;
  orderIndex: number;
  wordCount: number;
  status: ChapterStatus;
  publishedAt: string | null;
  rejectionReason: string | null;
}

interface VolumeDto {
  id: string;
  title: string;
  orderIndex: number;
}

interface GenreDto {
  name: string;
  slug: string;
  displayOrder: number;
  isActive: boolean;
}

// ---- workspace-facing shapes --------------------------------------------

export interface GenreOption {
  name: string;
  slug: string;
}

export interface GenreSelection {
  genreSlug: string;
  isPrimary: boolean;
}

export interface StoryRef {
  publicId: string;
  slug: string;
  title: string;
  status: StoryStatus;
}

export interface AuthorStory extends StoryRef {
  description: string;
  coverImageUrl: string;
  contentType: StoryContentType;
  ageRating: AgeRating;
  originalSource: string;
  language: string;
  genres: { name: string; slug: string; isPrimary: boolean }[];
  tags: string[];
}

export interface VolumeRef {
  id: string;
  title: string;
  orderIndex: number;
}

export interface AuthorChapter {
  id: string;
  title: string;
  orderIndex: number;
  status: ChapterStatus;
  volumeId: string | null;
  wordCount: number;
  rejectionReason: string | null;
}

export interface AuthorStoryView {
  story: AuthorStory;
  volumes: VolumeRef[];
  chapters: AuthorChapter[];
  /** true when the signed-in author owns this story (reorder/edit affordances). */
  isOwner: boolean;
}

export interface QuickPublishInput {
  title: string;
  description: string;
  coverImageUrl?: string;
  contentType?: StoryContentType;
  originalSource?: string;
  ageRating?: AgeRating;
  genres: GenreSelection[];
  tags: string[];
  chapterTitle?: string;
  chapterContent: string;
  completeImmediately?: boolean;
}

export interface CreateDraftInput {
  title: string;
  description: string;
  coverImageUrl?: string;
  contentType?: StoryContentType;
  originalSource?: string;
  ageRating?: AgeRating;
}

export interface AddVolumeInput {
  title: string;
  orderIndex?: number;
}

export interface AddChapterInput {
  title: string;
  content: string;
  orderIndex?: number;
  volumeId?: string;
  publishImmediately?: boolean;
}

// ---- helpers ------------------------------------------------------------

const TRACK_KEY = "sv_author_stories";

function toStoryRef(dto: StoryDetailDto): StoryRef {
  return { publicId: dto.id, slug: dto.slug, title: dto.title, status: dto.status };
}

function toAuthorStory(dto: StoryDetailDto): AuthorStory {
  return {
    ...toStoryRef(dto),
    description: dto.description ?? "",
    coverImageUrl: dto.coverImageUrl ?? "",
    contentType: dto.contentType,
    ageRating: dto.ageRating,
    originalSource: dto.originalSource ?? "",
    language: dto.language,
    genres: (dto.genres ?? []).map((g) => ({ name: g.name, slug: g.slug, isPrimary: g.isPrimary })),
    tags: dto.tags ?? [],
  };
}

function toAuthorChapter(dto: ChapterSummaryDto | ChapterDetailDto): AuthorChapter {
  return {
    id: dto.id,
    title: dto.title,
    orderIndex: Number(dto.orderIndex),
    status: dto.status,
    volumeId: dto.volumeId,
    wordCount: dto.wordCount,
    rejectionReason: dto.rejectionReason ?? null,
  };
}

function validateGenres(genres: GenreSelection[]): void {
  if (genres.length < 1) {
    throw new ApiError("Chọn ít nhất một thể loại.", { code: "validation" });
  }
  if (genres.filter((g) => g.isPrimary).length !== 1) {
    throw new ApiError("Chọn đúng một thể loại chính.", { code: "validation" });
  }
  const slugs = genres.map((g) => g.genreSlug);
  if (new Set(slugs).size !== slugs.length) {
    throw new ApiError("Thể loại phụ không được trùng thể loại chính.", { code: "validation" });
  }
}

// Builds the backend `genres` payload from a primary slug + secondary slugs,
// dropping any secondary that duplicates the primary.
export function buildGenreSelection(
  primarySlug: string,
  secondarySlugs: string[] = [],
): GenreSelection[] {
  const out: GenreSelection[] = [{ genreSlug: primarySlug, isPrimary: true }];
  for (const slug of secondarySlugs) {
    if (slug && slug !== primarySlug && !out.some((g) => g.genreSlug === slug)) {
      out.push({ genreSlug: slug, isPrimary: false });
    }
  }
  return out;
}

function validateTags(tags: string[]): void {
  if (tags.length > 30) {
    throw new ApiError("Tối đa 30 thẻ.", { code: "validation" });
  }
}

const trimOpt = (v?: string): string | undefined => {
  const t = v?.trim();
  return t ? t : undefined;
};

// ---- tracked story list (localStorage) --------------------------------

interface TrackedStory {
  slug: string;
  publicId: string;
  title: string;
}

function readTracked(): TrackedStory[] {
  try {
    const raw = localStorage.getItem(TRACK_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as TrackedStory[]) : [];
  } catch {
    return [];
  }
}

function writeTracked(list: TrackedStory[]): void {
  try {
    localStorage.setItem(TRACK_KEY, JSON.stringify(list));
  } catch {
    /* private mode — the list just won't persist */
  }
}

export function rememberStory(story: StoryRef): void {
  const list = readTracked().filter((s) => s.slug !== story.slug);
  list.unshift({ slug: story.slug, publicId: story.publicId, title: story.title });
  writeTracked(list);
}

export function forgetStory(slug: string): void {
  writeTracked(readTracked().filter((s) => s.slug !== slug));
}

// ---- profile / onboarding -------------------------------------------

export async function hasAuthorProfile(): Promise<AuthorProfileResponse | null> {
  try {
    return await authenticationApi.getMyAuthorProfile();
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export function becomeAuthor(input: {
  penName: string;
  bio?: string;
  avatarUrl?: string;
  bannerUrl?: string;
}): Promise<AuthorProfileResponse> {
  return authenticationApi.createAuthorProfile({
    penName: input.penName.trim(),
    bio: trimOpt(input.bio),
    avatarUrl: trimOpt(input.avatarUrl),
    bannerUrl: trimOpt(input.bannerUrl),
  });
}

// ---- taxonomy ------------------------------------------------------

export async function listGenres(): Promise<GenreOption[]> {
  const rows = await contentApi.client.get<GenreDto[]>("/v1/genres");
  return (rows ?? [])
    .filter((g) => g.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((g) => ({ name: g.name, slug: g.slug }));
}

// ---- authoring ---------------------------------------------------

export async function quickPublish(
  input: QuickPublishInput,
): Promise<{ story: AuthorStory; firstChapter: AuthorChapter }> {
  validateGenres(input.genres);
  validateTags(input.tags);

  const body = {
    title: input.title.trim(),
    description: input.description.trim(),
    coverImageUrl: trimOpt(input.coverImageUrl),
    contentType: input.contentType ?? "Original",
    originalSource: trimOpt(input.originalSource),
    language: "vi",
    ageRating: input.ageRating ?? "General",
    genres: input.genres,
    tags: input.tags,
    chapterTitle: trimOpt(input.chapterTitle),
    chapterContent: input.chapterContent.trim(),
    completeImmediately: input.completeImmediately ?? false,
  };

  const res = await contentApi.client.post<{
    story: StoryDetailDto;
    firstChapter: ChapterDetailDto;
  }>("/v1/stories/quick-publish", body);

  return { story: toAuthorStory(res.story), firstChapter: toAuthorChapter(res.firstChapter) };
}

// Anonymous publish — no login. The story is stamped with a guest owner id (0) and
// the typed pen name; the guest can't edit it afterwards.
export async function guestPublish(input: {
  penName: string;
  title: string;
  description?: string;
  genreSlug: string;
  chapterContent: string;
}): Promise<{ story: AuthorStory }> {
  const dto = await contentApi.client.post<StoryDetailDto>("/v1/stories/guest-publish", {
    guestPenName: input.penName.trim(),
    title: input.title.trim(),
    description: (input.description ?? "").trim(),
    genres: [{ genreSlug: input.genreSlug, isPrimary: true }],
    chapterContent: input.chapterContent.trim(),
  });
  return { story: toAuthorStory(dto) };
}

export async function createDraft(input: CreateDraftInput): Promise<StoryRef> {
  const dto = await contentApi.client.post<StoryDetailDto>("/v1/stories", {
    title: input.title.trim(),
    description: input.description.trim(),
    coverImageUrl: trimOpt(input.coverImageUrl),
    contentType: input.contentType ?? "Original",
    originalSource: trimOpt(input.originalSource),
    language: "vi",
    ageRating: input.ageRating ?? "General",
  });
  return toStoryRef(dto);
}

export async function setGenres(storyId: string, genres: GenreSelection[]): Promise<void> {
  validateGenres(genres);
  await contentApi.client.put(`/v1/stories/${storyId}/genres`, { genres });
}

export async function setTags(storyId: string, tags: string[]): Promise<void> {
  validateTags(tags);
  await contentApi.client.put(`/v1/stories/${storyId}/tags`, { tags });
}

export async function addVolume(storyId: string, input: AddVolumeInput): Promise<VolumeRef> {
  const dto = await contentApi.client.post<VolumeDto>(`/v1/stories/${storyId}/volumes`, {
    title: input.title.trim(),
    orderIndex: input.orderIndex ?? 0,
  });
  return { id: dto.id, title: dto.title, orderIndex: dto.orderIndex };
}

export async function updateVolume(
  volumeId: string,
  input: { title: string; orderIndex: number },
): Promise<VolumeRef> {
  const dto = await contentApi.client.put<VolumeDto>(`/v1/volumes/${volumeId}`, {
    title: input.title.trim(),
    orderIndex: input.orderIndex,
  });
  return { id: dto.id, title: dto.title, orderIndex: dto.orderIndex };
}

export async function addChapter(storyId: string, input: AddChapterInput): Promise<AuthorChapter> {
  const dto = await contentApi.client.post<ChapterDetailDto>(`/v1/stories/${storyId}/chapters`, {
    title: input.title.trim(),
    content: input.content.trim(),
    orderIndex: input.orderIndex ?? 0,
    volumeId: trimOpt(input.volumeId),
    publishImmediately: input.publishImmediately ?? false,
  });
  return toAuthorChapter(dto);
}

export async function updateChapter(
  chapterId: string,
  input: AddChapterInput & { orderIndex: number },
): Promise<void> {
  await contentApi.client.put(`/v1/chapters/${chapterId}`, {
    title: input.title.trim(),
    content: input.content.trim(),
    orderIndex: input.orderIndex,
    volumeId: trimOpt(input.volumeId),
  });
}

// Submits a draft (or resubmits a rejected) chapter for moderation. Does not
// publish it — a moderator must approve it first.
export async function submitChapterForReview(chapterId: string): Promise<void> {
  await contentApi.client.post(`/v1/chapters/${chapterId}/submit-for-review`);
}

export async function removeChapter(chapterId: string): Promise<void> {
  await contentApi.client.post(`/v1/chapters/${chapterId}/remove`);
}

export async function setStoryStatus(storyId: string, target: StoryStatus): Promise<void> {
  await contentApi.client.post(`/v1/stories/${storyId}/status`, { targetStatus: target });
}

// ---- reads for the workspace -------------------------------------

export async function getChapter(chapterId: string): Promise<{
  id: string;
  title: string;
  content: string;
  orderIndex: number;
  volumeId: string | null;
  status: ChapterStatus;
  rejectionReason: string | null;
}> {
  const dto = await contentApi.client.get<ChapterDetailDto>(`/v1/chapters/${chapterId}`);
  return {
    id: dto.id,
    title: dto.title,
    content: dto.content,
    orderIndex: Number(dto.orderIndex),
    volumeId: dto.volumeId,
    status: dto.status,
    rejectionReason: dto.rejectionReason ?? null,
  };
}

export async function getMyStory(slug: string): Promise<AuthorStoryView> {
  const story = await contentApi.client.get<StoryDetailDto>(
    `/v1/stories/by-slug/${encodeURIComponent(slug)}`,
  );
  const [volumes, chapters, myProfile] = await Promise.all([
    contentApi.client
      .get<VolumeDto[]>(`/v1/stories/${story.id}/volumes`)
      .catch(() => [] as VolumeDto[]),
    contentApi.client
      .get<ChapterSummaryDto[]>(`/v1/stories/${story.id}/chapters`)
      .catch(() => [] as ChapterSummaryDto[]),
    authenticationApi.getMyAuthorProfile().catch(() => null),
  ]);

  return {
    story: toAuthorStory(story),
    isOwner: myProfile != null && myProfile.authorProfileId === story.authorProfileId,
    volumes: (volumes ?? [])
      .map((v) => ({ id: v.id, title: v.title, orderIndex: v.orderIndex }))
      .sort((a, b) => a.orderIndex - b.orderIndex),
    chapters: (chapters ?? []).map(toAuthorChapter).sort((a, b) => a.orderIndex - b.orderIndex),
  };
}

// ---- reorder (Content service; owner or content.moderate only) ----------
// The id array must be exactly the members of the scope — the backend rejects a
// partial/extra/duplicated set with 400.

export async function reorderVolumes(
  storyId: string,
  orderedVolumeIds: string[],
): Promise<VolumeRef[]> {
  const dtos = await contentApi.client.put<VolumeDto[]>(
    `/v1/stories/${storyId}/volumes/order`,
    { orderedVolumeIds },
  );
  return (dtos ?? [])
    .map((v) => ({ id: v.id, title: v.title, orderIndex: v.orderIndex }))
    .sort((a, b) => a.orderIndex - b.orderIndex);
}

export async function reorderStoryChapters(
  storyId: string,
  orderedChapterIds: string[],
): Promise<void> {
  await contentApi.client.put(`/v1/stories/${storyId}/chapters/order`, { orderedChapterIds });
}

export async function reorderVolumeChapters(
  volumeId: string,
  orderedChapterIds: string[],
): Promise<void> {
  await contentApi.client.put(`/v1/volumes/${volumeId}/chapters/order`, { orderedChapterIds });
}

interface StorySummaryDto {
  id: string;
  title: string;
  slug: string;
  status: StoryStatus;
  primaryGenre: string | null;
}

interface PagedDto<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

// The author's own stories, drafts included — GET /v1/stories/mine (JWT
// author_id). Falls back to the localStorage-tracked slug list only if the
// endpoint is unavailable (older backend).
export async function listMyStories(): Promise<StoryRef[]> {
  try {
    const paged = await contentApi.client.get<PagedDto<StorySummaryDto>>("/v1/stories/mine", {
      params: { "sort-by": "createdAt", "sort-direction": "desc", "page-size": 100 },
    });
    return (paged.items ?? []).map((s) => ({
      publicId: s.id,
      slug: s.slug,
      title: s.title,
      status: s.status,
    }));
  } catch (err) {
    if (err instanceof ApiError && err.code === "not_implemented") {
      const tracked = readTracked();
      const results = await Promise.all(
        tracked.map((t) =>
          contentApi.client
            .get<StoryDetailDto>(`/v1/stories/by-slug/${encodeURIComponent(t.slug)}`)
            .then((dto) => toStoryRef(dto))
            .catch(() => null),
        ),
      );
      return results.filter((s): s is StoryRef => s !== null);
    }
    throw err;
  }
}
