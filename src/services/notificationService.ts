// Notification facade — Notification service.
//
// NOTE: nothing on the backend produces notifications yet (no event bus). The feed
// is populated only by `createNotification` (E2E script + communityService reply shim).

import { notificationApi } from "@/services/api/notificationApi";
import { contentApi } from "@/services/api/contentApi";
import { ROUTES } from "@/utils/constants";

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

// Best-effort route resolution for a notification's type/refType/refId, used
// by NotificationBell to navigate on click. For refType "Chapter" the refId
// is a chapter id, so this looks the chapter up to find its story's slug.
//
// - type "ChapterRejected": the chapter is not published, so the public
//   reader path /story/{slug}/chapter/{order} would 404. Route the author to
//   their chapter editor instead: /tac-gia/truyen/{slug}/chuong/{chapterId}.
// - everything else with refType "Chapter" (e.g. "ChapterApproved", comment
//   replies): the chapter is public, so build the reader path.
//
// Returns null for anything it can't resolve (unknown refType, missing data,
// fetch failure) so the caller can just no-op instead of navigating.
export async function resolveNotificationRoute(
  n: Pick<AppNotification, "type" | "refType" | "refId">,
): Promise<string | null> {
  if (n.refType !== "Chapter" || !n.refId) return null;
  try {
    const chapter = await contentApi.client.get<{ id: string; storyId: string }>(
      `/v1/chapters/${n.refId}`,
    );
    const story = await contentApi.client.get<{ slug: string }>(`/v1/stories/${chapter.storyId}`);
    if (n.type === "ChapterRejected") {
      return ROUTES.authorChapter(story.slug, chapter.id);
    }
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
