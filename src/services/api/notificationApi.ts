// story-be-prj/src/Services/Notifications  (Notification.Api)
// Status: IMPLEMENTED (read + mark-read). Routes: Notification.Api/Controllers/v1/NotificationsController.
// NOTE: nothing on the backend PRODUCES notifications yet (no event bus / consumer).
// `createNotification` (POST /v1/notifications) is currently open to any authed user
// and is used only by the E2E script and the dev reply-shim in communityService.
// NotificationType: NewChapter | CommentReply | ReportResult | SystemAnnouncement.

import { createApiClient } from "./client";
import { resolveBaseUrl } from "./config";

const client = createApiClient(resolveBaseUrl("notification"));

type Query = Record<string, string | number | boolean | undefined>;

export const notificationApi = {
  client,

  listMyNotifications: (params?: Query) => client.get("/v1/notifications", { params }),
  getUnreadCount: () => client.get("/v1/notifications/unread-count"),
  markRead: (id: string) => client.post(`/v1/notifications/${id}/read`),
  markAllRead: () => client.post("/v1/notifications/read-all"),
  createNotification: (body: {
    userId: number;
    type: string;
    title: string;
    body: string;
    refType?: string;
    refId?: string;
  }) => client.post("/v1/notifications", body),
};
