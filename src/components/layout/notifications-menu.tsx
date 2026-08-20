"use client";

import Link from "next/link";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn, formatRelativeTime } from "@/lib/utils";
import { useMarkAllNotificationsRead, useQuickNotifications, useUnreadNotificationCount } from "@/hooks/queries/use-notifications";
import { notificationIcon } from "@/features/notifications/notification-icon";

/**
 * Header bell backed by GET /notifications/quick + /unread-count. Both queries
 * are invalidated by the socket provider the moment a `notification:new`
 * event lands, so the badge updates without polling.
 */
export function NotificationsMenu() {
  const { data: notifications, isLoading } = useQuickNotifications();
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const markAll = useMarkAllNotificationsRead();

  const list = notifications ?? [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground relative" aria-label="Notifications">
          <Bell className="size-4.5" />
          {unreadCount > 0 && (
            <span className="bg-destructive text-destructive-foreground ring-card absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ring-2">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-88 p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <DropdownMenuLabel className="p-0">
            Notifications
            {unreadCount > 0 && <span className="text-muted-foreground ml-1.5 text-xs font-normal">({unreadCount} new)</span>}
          </DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
            >
              {markAll.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCheck className="size-3.5" />}
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />

        <div className="thin-scrollbar max-h-88 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="text-primary size-5 animate-spin" />
            </div>
          ) : list.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center gap-2 px-4 py-10 text-center">
              <Bell className="size-5" />
              <p className="text-xs">You&apos;re all caught up.</p>
            </div>
          ) : (
            list.map((n) => {
              const { icon: Icon, tone } = notificationIcon(n.title);
              return (
                <Link
                  key={n.id}
                  href="/dashboard/notifications"
                  className={cn(
                    "hover:bg-muted flex items-start gap-3 border-b border-border/50 px-3 py-2.5 transition-colors last:border-0",
                    !n.isRead && "bg-primary-soft/30",
                  )}
                >
                  <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", tone)}>
                    <Icon className="size-4" />
                  </span>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-foreground truncate text-sm font-medium">{n.title}</span>
                    <span className="text-muted-foreground line-clamp-2 text-xs">{n.message}</span>
                    <span className="text-muted-foreground text-[11px]">{formatRelativeTime(n.createdAt)}</span>
                  </div>
                  {!n.isRead && <span className="bg-primary mt-1.5 size-2 shrink-0 rounded-full" />}
                </Link>
              );
            })
          )}
        </div>

        <DropdownMenuSeparator className="m-0" />
        <Link
          href="/dashboard/notifications"
          className="text-primary hover:bg-muted block px-3 py-2.5 text-center text-xs font-medium transition-colors"
        >
          View all notifications
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
