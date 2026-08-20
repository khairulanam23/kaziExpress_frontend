"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Bell, CheckCheck, Loader2, Trash2 } from "lucide-react";
import { SectionHeader } from "@/components/shared/chart-card";
import { Pagination } from "@/components/shared/pagination";
import { ConfirmDialog, EmptyState, ErrorState, TableSkeleton } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { notificationIcon } from "@/features/notifications/notification-icon";
import {
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from "@/hooks/queries/use-notifications";
import { getApiErrorMessage } from "@/lib/api-client";
import { cn, formatDateTime, formatRelativeTime } from "@/lib/utils";
import type { Notification } from "@/types";

const PAGE_SIZE = 15;

export default function NotificationsPage() {
  const [tab, setTab] = React.useState<"all" | "unread">("all");
  const [page, setPage] = React.useState(1);
  const [deleting, setDeleting] = React.useState<Notification | null>(null);

  const { data, isLoading, isError, error, refetch } = useNotifications({
    page,
    limit: PAGE_SIZE,
    unreadOnly: tab === "unread",
  });
  const { data: unreadCount = 0 } = useUnreadNotificationCount();

  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const remove = useDeleteNotification();

  const notifications = data?.data ?? [];

  const handleMarkAll = () =>
    markAll.mutate(undefined, {
      onSuccess: () => toast.success("All notifications marked as read"),
      onError: (err) => toast.error("Couldn't update notifications", { description: getApiErrorMessage(err) }),
    });

  const handleDelete = () => {
    if (!deleting) return;
    remove.mutate(deleting.id, {
      onSuccess: () => {
        toast.success("Notification deleted");
        setDeleting(null);
      },
      onError: (err) => toast.error("Couldn't delete notification", { description: getApiErrorMessage(err) }),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Notifications"
        description="Alerts, approvals and task updates from the last 28 days."
        action={
          unreadCount > 0 ? (
            <Button variant="outline" onClick={handleMarkAll} disabled={markAll.isPending}>
              {markAll.isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCheck className="size-4" />}
              Mark all read
            </Button>
          ) : undefined
        }
      />

      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v as "all" | "unread");
          setPage(1);
        }}
      >
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">
            Unread
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-1.5">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="gap-0 overflow-hidden py-0">
        {isError ? (
          <div className="p-4">
            <ErrorState error={error} onRetry={() => refetch()} />
          </div>
        ) : isLoading && !data ? (
          <TableSkeleton rows={6} />
        ) : notifications.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={Bell}
              title={tab === "unread" ? "No unread notifications" : "No notifications yet"}
              description={
                tab === "unread"
                  ? "You're all caught up."
                  : "Task assignments, approvals and stock alerts will appear here."
              }
            />
          </div>
        ) : (
          <>
            <div className="flex flex-col">
              {notifications.map((n) => {
                const { icon: Icon, tone } = notificationIcon(n.title);
                const body = (
                  <>
                    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", tone)}>
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{n.title}</p>
                        {!n.isRead && <span className="bg-primary size-2 shrink-0 rounded-full" />}
                      </div>
                      <p className="text-muted-foreground text-sm">{n.message}</p>
                      <p className="text-muted-foreground mt-0.5 text-xs" title={formatDateTime(n.createdAt)}>
                        {formatRelativeTime(n.createdAt)}
                      </p>
                    </div>
                  </>
                );

                return (
                  <div
                    key={n.id}
                    className={cn(
                      "hover:bg-muted/40 flex items-start gap-3 border-b border-border px-4 py-3 transition-colors last:border-0",
                      !n.isRead && "bg-primary-soft/20",
                    )}
                  >
                    {n.targetUrl ? (
                      <Link
                        href={n.targetUrl}
                        className="flex min-w-0 flex-1 items-start gap-3"
                        onClick={() => !n.isRead && markRead.mutate(n.id)}
                      >
                        {body}
                      </Link>
                    ) : (
                      <div className="flex min-w-0 flex-1 items-start gap-3">{body}</div>
                    )}

                    <div className="flex shrink-0 items-center gap-1">
                      {!n.isRead && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => markRead.mutate(n.id)}
                          disabled={markRead.isPending}
                          aria-label="Mark as read"
                          title="Mark as read"
                        >
                          <CheckCheck className="size-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleting(n)}
                        aria-label="Delete notification"
                        title="Delete"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pb-4">
              <Pagination
                page={data?.meta.page ?? page}
                pageCount={data?.meta.totalPages ?? 1}
                onPageChange={setPage}
                totalItems={data?.meta.total ?? 0}
                pageSize={PAGE_SIZE}
              />
            </div>
          </>
        )}
      </Card>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this notification?"
        description="It will be permanently removed from your list."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        isPending={remove.isPending}
      />
    </div>
  );
}
