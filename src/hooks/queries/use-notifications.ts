"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsService, type NotificationListParams } from "@/services/notifications.service";
import { useAuthStore } from "@/store/auth-store";

const NOTIFICATIONS_KEY = ["notifications"] as const;

export function useNotifications(params?: NotificationListParams) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, "list", params ?? {}],
    queryFn: () => notificationsService.list(params),
    enabled: isAuthenticated,
    placeholderData: (prev) => prev,
  });
}

export function useQuickNotifications() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, "quick"],
    queryFn: () => notificationsService.quick(),
    enabled: isAuthenticated,
  });
}

export function useUnreadNotificationCount() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, "unread-count"],
    queryFn: () => notificationsService.unreadCount(),
    enabled: isAuthenticated,
  });
}

function useInvalidateNotifications() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
}

export function useMarkNotificationRead() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: (id: string) => notificationsService.markAsRead(id),
    onSuccess: invalidate,
  });
}

export function useMarkAllNotificationsRead() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: () => notificationsService.markAllAsRead(),
    onSuccess: invalidate,
  });
}

export function useDeleteNotification() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: (id: string) => notificationsService.remove(id),
    onSuccess: invalidate,
  });
}
