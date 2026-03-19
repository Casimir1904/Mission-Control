"use client";

import { useEffect, useRef, useMemo, useCallback } from "react";
import { X, CheckCheck, Trash2 } from "lucide-react";
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

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
}

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

function groupByTime(items: Notification[]): Map<string, Notification[]> {
  const groups = new Map<string, Notification[]>();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStart = todayStart - 6 * 86_400_000;

  for (const n of items) {
    const ts = new Date(n.created_at).getTime();
    let key: string;
    if (ts >= todayStart) {
      key = "Today";
    } else if (ts >= weekStart) {
      key = "Earlier This Week";
    } else {
      key = "Older";
    }
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(n);
  }

  return groups;
}

function NotificationItemSkeleton() {
  return (
    <div className="px-space-4 py-space-3">
      <Skeleton className="mb-space-1 h-4 w-3/4" />
      <Skeleton className="h-3 w-full" />
    </div>
  );
}

function NotificationItem({
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
        "group relative flex gap-space-3 px-space-4 py-space-3 transition-colors hover:bg-bg-elevated",
        !notification.read && "border-l-2 border-l-accent-primary"
      )}
      role="article"
      aria-label={`${notification.title}${notification.read ? "" : " (unread)"}`}
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
        <p className="mt-0.5 text-xs text-text-secondary line-clamp-2">
          {notification.body}
        </p>
        <p className="mt-space-1 font-mono text-[10px] text-text-muted tabular-nums">
          {timeAgo(notification.created_at)}
        </p>
      </div>

      {/* Actions on hover */}
      <div className="flex shrink-0 items-start gap-space-1 opacity-0 transition-opacity group-hover:opacity-100">
        {!notification.read && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead(notification.id);
            }}
            className="flex h-7 w-7 items-center justify-center rounded text-text-muted transition-colors hover:bg-bg-overlay hover:text-text-primary"
            aria-label="Mark as read"
          >
            <CheckCheck size={14} aria-hidden="true" />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification.id);
          }}
          className="flex h-7 w-7 items-center justify-center rounded text-text-muted transition-colors hover:bg-bg-overlay hover:text-status-critical"
          aria-label="Delete notification"
        >
          <Trash2 size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export function NotificationPanel({ open, onClose }: NotificationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();

  const notifications = data?.items ?? [];
  const grouped = useMemo(() => groupByTime(notifications), [notifications]);
  const hasUnread = notifications.some((n) => !n.read);

  const handleMarkRead = useCallback(
    (id: string) => markRead.mutate(id),
    [markRead]
  );

  const handleDelete = useCallback(
    (id: string) => deleteNotification.mutate(id),
    [deleteNotification]
  );

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Focus trap - focus panel on open
  useEffect(() => {
    if (open && panelRef.current) {
      panelRef.current.focus();
    }
  }, [open]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to avoid closing immediately on the bell click
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handler);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handler);
    };
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-[400px] max-w-full flex-col border-l border-border-subtle bg-bg-surface shadow-2xl",
          "transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-label="Notifications"
        aria-modal="true"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border-subtle px-space-4 py-space-3">
          <h2 className="text-sm font-semibold text-text-primary">
            Notifications
          </h2>
          <div className="flex items-center gap-space-2">
            {hasUnread && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
              >
                Mark all read
              </Button>
            )}
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
              aria-label="Close notifications"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div>
              {Array.from({ length: 5 }).map((_, i) => (
                <NotificationItemSkeleton key={i} />
              ))}
            </div>
          )}

          {!isLoading && notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-text-secondary">
                No notifications yet
              </p>
              <p className="mt-space-1 text-xs text-text-muted">
                You will be notified when agents need your attention.
              </p>
            </div>
          )}

          {!isLoading &&
            Array.from(grouped.entries()).map(([group, items]) => (
              <div key={group}>
                <div className="sticky top-0 z-10 bg-bg-surface px-space-4 py-space-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                    {group}
                  </p>
                </div>
                {items.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onMarkRead={handleMarkRead}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            ))}
        </div>
      </div>
    </>
  );
}
