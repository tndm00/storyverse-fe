// story-be-prj/src/Services/Communities  (Community.Api)
// Status: IMPLEMENTED. Routes: Community.Api/Controllers/v1/{Comments,Ratings,Votes}Controller.
// Comments are on a chapter, one reply level via parentCommentId. Ratings: one per
// user per story. Votes: one per user per story per ISO week.

import { createApiClient } from "./client";
import { resolveBaseUrl } from "./config";

const client = createApiClient(resolveBaseUrl("community"));

type Query = Record<string, string | number | boolean | undefined>;

export const communityApi = {
  client,

  // ---- comments -------------------------------------------------------
  listChapterComments: (chapterId: string, params?: Query) =>
    client.get("/v1/comments", { params: { "chapter-id": chapterId, ...params } }),
  addComment: (body: { chapterId: string; content: string }) => client.post("/v1/comments", body),
  replyToComment: (commentId: string, content: string) =>
    client.post(`/v1/comments/${commentId}/replies`, { content }),
  editComment: (commentId: string, content: string) =>
    client.put(`/v1/comments/${commentId}`, { content }),
  deleteComment: (commentId: string) => client.del(`/v1/comments/${commentId}`),
  setCommentVisibility: (commentId: string, hide: boolean) =>
    client.post(`/v1/comments/${commentId}/${hide ? "hide" : "unhide"}`),
  // Moderator hide/unhide with an audit reason (community.moderate). Batch 2.
  setCommentModerationVisibility: (commentId: string, hidden: boolean, reason: string) =>
    client.post(`/v1/comments/${commentId}/moderation-visibility`, { hidden, reason }),

  // ---- ratings -------------------------------------------------------
  getStoryRatings: (storyId: string, params?: Query) =>
    client.get("/v1/ratings", { params: { "story-id": storyId, ...params } }),
  getMyRating: (storyId: string) =>
    client.get("/v1/ratings/mine", { params: { "story-id": storyId } }),
  rateStory: (body: { storyId: string; score: number; reviewText: string }) =>
    client.put("/v1/ratings", body),

  // ---- votes -------------------------------------------------------
  voteStory: (storyId: string) => client.post("/v1/votes", { storyId }),
  getVoteCount: (storyId: string) =>
    client.get("/v1/votes/count", { params: { "story-id": storyId } }),
};
