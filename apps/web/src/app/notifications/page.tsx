"use client";

import { useCallback } from "react";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/status/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from "@/lib/api/hooks";
import type { Notification } from "@/lib/api/types";

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function NotificationRow({
  notification,
  onMarkRead,
  onDelete,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        "group flex items-start gap-space-3 border-b border-border-subtle px-space-4 py-space-3 transition-colors hover:bg-bg-elevated",
        !notification.read && "border-l-2 border-l-accent-primary"
      )}
    >
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm",
            notification.read
              ? "text-text-secondary"
              : "font-semibold text-text-primary"
          )}
        >
          {notification.title}
        </p>
        <p className="mt-0.5 text-xs text-text-secondary">
          {notification.body}
        </p>
        <p className="mt-space-1 font-mono text-[10px] text-text-muted tabular-nums">
          {timeAgo(notification.created_at)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-space-1 opacity-0 transition-opacity group-hover:opacity-100">
        {!notification.read && (
          <button
            onClick={() => onMarkRead(notification.id)}
            className="flex h-7 w-7 items-center justify-center rounded text-text-muted hover:bg-bg-overlay hover:text-text-primary"
            aria-label="Mark as read"
          >
            <CheckCheck size={14} aria-hidden="true" />
          </button>
        )}
        <button
          onClick={() => onDelete(notification.id)}
          className="flex h-7 w-7 items-center justify-center rounded text-text-muted hover:bg-bg-overlay hover:text-status-critical"
          aria-label="Delete"
        >
          <Trash2 size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();

  const notifications = data?.items ?? [];
  const hasUnread = notifications.some((n) => !n.read);
  const isEmpty = !isLoading && notifications.length === 0;

  const handleMarkRead = useCallback(
    (id: string) => markRead.mutate(id),
    [markRead]
  );

  const handleDelete = useCallback(
    (id: string) => deleteNotification.mutate(id),
    [deleteNotification]
  );

  return (
    <DashboardShell>
      <PageHeader
        title="Notifications"
        description="Alerts and updates from your agent operations"
        action={
          hasUnread ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck size={14} aria-hidden="true" />
              Mark all read
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="rounded-md border border-border-subtle bg-bg-surface">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="border-b border-border-subtle px-space-4 py-space-3"
            >
              <Skeleton className="mb-space-1 h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      ) : isEmpty ? (
        <EmptyState
          icon={Bell}
          title="All caught up"
          description="Notifications appear when agents need attention, approvals are pending, or system alerts fire. You're all clear."
        />
      ) : (
        <div className="rounded-md border border-border-subtle bg-bg-surface">
          {notifications.map((n) => (
            <NotificationRow
              key={n.id}
              notification={n}
              onMarkRead={handleMarkRead}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
