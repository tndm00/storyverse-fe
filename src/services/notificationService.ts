// Notification facade — Notification service.
//
// NOTE: nothing on the backend produces notifications yet (no event bus). The feed
// is populated only by `createNotification` (E2E script + communityService reply shim).

import { notificationApi } from "@/services/api/notificationApi";
import { contentApi } from "@/services/api/contentApi";

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  refType: string | null;
  refId: string | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationDto extends Omit<AppNotification, "refType" | "refId"> {
  refType: string | null;
  refId: string | null;
}

interface Paged<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export interface NotificationPage {
  items: AppNotification[];
  totalCount: number;
}

export async function listMyNotifications(
  opts: { isRead?: boolean; pageNumber?: number; pageSize?: number } = {},
): Promise<NotificationPage> {
  const paged = await notificationApi.client.get<Paged<NotificationDto>>("/v1/notifications", {
    params: {
      "is-read": opts.isRead,
      "page-number": opts.pageNumber ?? 1,
      "page-size": opts.pageSize ?? 8,
    },
  });
  return { items: paged.items ?? [], totalCount: paged.totalCount ?? 0 };
}

export async function getUnreadCount(): Promise<number> {
  const res = await notificationApi.client.get<{ count: number }>("/v1/notifications/unread-count");
  return res?.count ?? 0;
}

export async function markRead(id: string): Promise<void> {
  await notificationApi.client.post(`/v1/notifications/${id}/read`);
}

export async function markAllRead(): Promise<void> {
  await notificationApi.client.post("/v1/notifications/read-all");
}

// Best-effort route resolution for a notification's refType/refId, used by
// NotificationBell to navigate on click. The only ref type any real path
// creates today is "Chapter" (see communityService.replyToComment's dev
// shim) — refId is a chapter id, so this looks the chapter up to find its
// story's slug and builds /story/{slug}/chapter/{chapterId}. Returns null
// for anything it can't resolve (unknown refType, missing data, fetch
// failure) so the caller can just no-op instead of navigating.
export async function resolveNotificationRoute(
  n: Pick<AppNotification, "refType" | "refId">,
): Promise<string | null> {
  if (n.refType !== "Chapter" || !n.refId) return null;
  try {
    const chapter = await contentApi.client.get<{ id: string; storyId: string }>(
      `/v1/chapters/${n.refId}`,
    );
    const story = await contentApi.client.get<{ slug: string }>(`/v1/stories/${chapter.storyId}`);
    return `/story/${story.slug}/chapter/${chapter.id}`;
  } catch {
    return null;
  }
}

export async function createNotification(input: {
  userId: number;
  type: string;
  title: string;
  body: string;
  refType?: string;
  refId?: string;
}): Promise<void> {
  await notificationApi.client.post("/v1/notifications", input);
}
