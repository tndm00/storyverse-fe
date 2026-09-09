// story-be-prj/src/Services/Libraries  (Library.Api)
// Status: IMPLEMENTED. Routes: Library.Api/Controllers/v1/{Library,ReadingProgress}Controller.
// LibraryEntry = deliberate follow + shelf status (Reading | PlanToRead | Completed
// | Dropped). ReadingProgress = automatic last-read position per story.

import { createApiClient } from "./client";
import { resolveBaseUrl } from "./config";

const client = createApiClient(resolveBaseUrl("library"));

type Query = Record<string, string | number | boolean | undefined>;

export const libraryApi = {
  client,

  listMyLibrary: (params?: Query) => client.get("/v1/library", { params }),
  addLibraryEntry: (storyId: string, shelfStatus?: string) =>
    client.post("/v1/library", { storyId, shelfStatus }),
  updateLibraryEntry: (storyId: string, shelfStatus: string) =>
    client.put(`/v1/library/${storyId}/shelf-status`, { shelfStatus }),
  removeLibraryEntry: (storyId: string) => client.del(`/v1/library/${storyId}`),

  listContinueReading: (params?: Query) =>
    client.get("/v1/reading-progress/continue-reading", { params }),
  getReadingProgress: (storyId: string) => client.get(`/v1/reading-progress/${storyId}`),
  saveReadingProgress: (storyId: string, body: { lastChapterId: string; scrollPercent?: number }) =>
    client.put(`/v1/reading-progress/${storyId}`, body),
};
