// story-be-prj/src/Services/Contents  (Content.Api)
// Status: IMPLEMENTED. Routes: Content.Api/Constants/ControllerRouteConstants.cs
// Controllers: Stories, Chapters, Volumes, Genres, Tags.

import { createApiClient } from "./client";
import { resolveBaseUrl } from "./config";

const client = createApiClient(resolveBaseUrl("content"));

type Query = Record<string, string | number | boolean | undefined>;
type Body = Record<string, unknown>;
type Id = string;

export const contentApi = {
  client,

  // ---- stories ----------------------------------------------------------
  // GET /v1/stories  (anonymous, published-only)
  // params: genre-slug, tag-slug, status, sort-by, sort-direction, page-number, page-size
  listStories: (params?: Query) => client.get("/v1/stories", { params }),
  getStoryBySlug: (slug: string) => client.get(`/v1/stories/by-slug/${encodeURIComponent(slug)}`),
  getStory: (storyId: Id) => client.get(`/v1/stories/${storyId}`),
  createStory: (body: Body) => client.post("/v1/stories", body),
  quickPublishStory: (body: Body) => client.post("/v1/stories/quick-publish", body),
  updateStory: (storyId: Id, body: Body) => client.put(`/v1/stories/${storyId}`, body),
  updateStoryGenres: (storyId: Id, body: Body) => client.put(`/v1/stories/${storyId}/genres`, body),
  updateStoryTags: (storyId: Id, body: Body) => client.put(`/v1/stories/${storyId}/tags`, body),
  // POST /v1/stories/{id}/status  { targetStatus }  (owner only)
  changeStoryStatus: (storyId: Id, targetStatus: string) =>
    client.post(`/v1/stories/${storyId}/status`, { targetStatus }),

  // ---- volumes --------------------------------------------------------
  listStoryVolumes: (storyId: Id) => client.get(`/v1/stories/${storyId}/volumes`),
  createStoryVolume: (storyId: Id, body: Body) =>
    client.post(`/v1/stories/${storyId}/volumes`, body),

  // ---- chapters ------------------------------------------------------
  listStoryChapters: (storyId: Id, params?: Query) =>
    client.get(`/v1/stories/${storyId}/chapters`, { params }),
  createStoryChapter: (storyId: Id, body: Body) =>
    client.post(`/v1/stories/${storyId}/chapters`, body),
  getChapter: (chapterId: Id) => client.get(`/v1/chapters/${chapterId}`),
  updateChapter: (chapterId: Id, body: Body) => client.put(`/v1/chapters/${chapterId}`, body),
  // Author submits (or resubmits after rejection) for moderation — does not
  // publish directly. See the review-queue methods below for the decision.
  submitChapterForReview: (chapterId: Id) =>
    client.post(`/v1/chapters/${chapterId}/submit-for-review`),
  scheduleChapter: (chapterId: Id, scheduledAt: string) =>
    client.post(`/v1/chapters/${chapterId}/schedule`, { scheduledAt }),
  cancelChapterSchedule: (chapterId: Id) =>
    client.post(`/v1/chapters/${chapterId}/cancel-schedule`),
  removeChapter: (chapterId: Id) => client.post(`/v1/chapters/${chapterId}/remove`),

  // ---- chapter moderation (content.moderate) --------------------------
  listPendingReviewChapters: (params?: Query) =>
    client.get("/v1/chapters/pending-review", { params }),
  getChapterForReview: (chapterId: Id) => client.get(`/v1/chapters/${chapterId}/for-review`),
  reviewChapter: (chapterId: Id) => client.post(`/v1/chapters/${chapterId}/review`),
  approveChapter: (chapterId: Id) => client.post(`/v1/chapters/${chapterId}/approve`),
  rejectChapter: (chapterId: Id, reason: string) =>
    client.post(`/v1/chapters/${chapterId}/reject`, { reason }),

  // ---- taxonomy ----------------------------------------------------
  // GET /v1/genres  (anonymous, active only). ?include-inactive=true for the admin page.
  listGenres: (includeInactive = false) =>
    client.get(
      "/v1/genres",
      includeInactive ? { params: { "include-inactive": true } } : undefined,
    ),
  // genres.manage (PlatformAdmin)
  createGenre: (body: { name: string; description?: string; displayOrder: number }) =>
    client.post("/v1/genres", body),
  updateGenre: (
    slug: string,
    body: { name: string; description?: string; displayOrder: number; isActive: boolean },
  ) => client.put(`/v1/genres/${encodeURIComponent(slug)}`, body),
  hideGenre: (slug: string) => client.post(`/v1/genres/${encodeURIComponent(slug)}/hide`),
  listTags: (params?: Query) => client.get("/v1/tags", { params }),
};
