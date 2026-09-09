// Notification facade.
//   useRealApi -> Notification service
//   mock       -> empty feed, zero count, mutations no-op (bell renders, never throws)
//
// NOTE: nothing on the backend produces notifications yet (no event bus). The feed
// is populated only by `createNotification` (E2E script + communityService reply shim).

import { notificationApi } from "@/services/api/notificationApi";
import { useRealApi } from "@/services/dataSource";

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

const EMPTY: NotificationPage = { items: [], totalCount: 0 };

export async function listMyNotifications(
  opts: { isRead?: boolean; pageNumber?: number; pageSize?: number } = {},
): Promise<NotificationPage> {
  if (!useRealApi) return EMPTY;
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
  if (!useRealApi) return 0;
  const res = await notificationApi.client.get<{ count: number }>("/v1/notifications/unread-count");
  return res?.count ?? 0;
}

export async function markRead(id: string): Promise<void> {
  if (!useRealApi) return;
  await notificationApi.client.post(`/v1/notifications/${id}/read`);
}

export async function markAllRead(): Promise<void> {
  if (!useRealApi) return;
  await notificationApi.client.post("/v1/notifications/read-all");
}

export async function createNotification(input: {
  userId: number;
  type: string;
  title: string;
  body: string;
  refType?: string;
  refId?: string;
}): Promise<void> {
  if (!useRealApi) return;
  await notificationApi.client.post("/v1/notifications", input);
}
