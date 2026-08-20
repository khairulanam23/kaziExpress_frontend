import { apiClient, type ApiEnvelope } from "@/lib/api-client";
import type { Notification, NotificationListResponse } from "@/types";

export interface NotificationListParams {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

export const notificationsService = {
  /** GET /notifications — paginated, 28-day retention enforced server-side. */
  list: async (params?: NotificationListParams) => {
    const { data } = await apiClient.get<ApiEnvelope<NotificationListResponse>>("/notifications", {
      params: { ...params, unreadOnly: params?.unreadOnly ? "true" : undefined },
    });
    return data.data as NotificationListResponse;
  },

  /** GET /notifications/quick — newest 5, for the header dropdown. */
  quick: async () => {
    const { data } = await apiClient.get<ApiEnvelope<Notification[]>>("/notifications/quick");
    return data.data ?? [];
  },

  /** GET /notifications/unread-count */
  unreadCount: async () => {
    const { data } = await apiClient.get<ApiEnvelope<{ count: number }>>("/notifications/unread-count");
    return data.data?.count ?? 0;
  },

  /** PATCH /notifications/:id/read */
  markAsRead: async (id: string) => {
    const { data } = await apiClient.patch<ApiEnvelope<Notification>>(`/notifications/${id}/read`);
    return data.data as Notification;
  },

  /** PATCH /notifications/read-all */
  markAllAsRead: async () => {
    const { data } = await apiClient.patch<ApiEnvelope<{ count: number }>>("/notifications/read-all");
    return data.data;
  },

  /** DELETE /notifications/:id */
  remove: async (id: string) => {
    await apiClient.delete(`/notifications/${id}`);
  },
};
