import { api } from "./client";
import type { NotificationItem } from "../types";
import type { Page } from "./admin";

export async function fetchNotifications(page = 0, size = 20): Promise<Page<NotificationItem>> {
  const { data } = await api.get<Page<NotificationItem>>("/notifications", {
    params: { page, size },
  });
  return data;
}

export async function fetchUnreadCount(): Promise<number> {
  const { data } = await api.get<{ count: number }>("/notifications/unread-count");
  return data.count;
}

export async function markNotificationRead(id: number): Promise<void> {
  await api.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.patch("/notifications/read-all");
}
