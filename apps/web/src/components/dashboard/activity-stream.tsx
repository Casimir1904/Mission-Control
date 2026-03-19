"use client";

import { useRef, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/status/empty-state";
import { Activity } from "lucide-react";
import type { ActivityEvent } from "@/lib/api/types";

interface ActivityStreamProps {
  events: ActivityEvent[];
  isLoading: boolean;
}

/**
 * Format an event into a human-readable description.
 */
function formatEventDescription(event: ActivityEvent): string {
  const payload = event.payload ?? {};
  const agentName = (payload.agent_name as string) ?? "An agent";
  const taskTitle = (payload.task_title as string) ?? `Task #${event.entity_id?.slice(0, 6) ?? "?"}`;

  switch (event.event_type) {
    case "task.transitioned":
      if (payload.to_status === "done") {
        return `${agentName} completed ${taskTitle}`;
      }
      return `${taskTitle} moved to ${String(payload.to_status ?? "unknown").replace("_", " ")}`;

    case "task.created":
      return `New task created: ${taskTitle}`;

    case "task.assigned":
      return `${taskTitle} assigned to ${agentName}`;

    case "approval.submitted":
      return `Approval needed: ${taskTitle}`;

    case "approval.reviewed":
      return `Approval ${String(payload.status ?? "reviewed")}: ${taskTitle}`;

    case "agent.status_changed":
      if (payload.status === "offline") {
        return `${agentName} went offline`;
      }
      if (payload.status === "online") {
        return `${agentName} came online`;
      }
      return `${agentName} status changed to ${String(payload.status ?? "unknown")}`;

    case "agent.heartbeat":
      return `${agentName} heartbeat received`;

    case "board.created":
      return `Board "${String(payload.board_name ?? event.entity_id)}" created`;

    default:
      return `${event.entity_type}.${event.event_type}`;
  }
}

/**
 * Format an ISO timestamp into a compact time string (HH:MM).
 */
function formatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "--:--";
  }
}

/**
 * Live activity feed showing the last 20 events.
 * Auto-scrolls to top when new events arrive.
 * Uses monospace timestamps and compact rows per DESIGN.md.
 */
export function ActivityStream({ events, isLoading }: ActivityStreamProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(events.length);

  // Auto-scroll to top when new events arrive
  useEffect(() => {
    if (events.length > prevCountRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    prevCountRef.current = events.length;
  }, [events.length]);

  if (isLoading) {
    return (
      <Card className="flex h-full flex-col">
        <CardHeader>
          <CardTitle>Activity</CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="space-y-space-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-space-2">
                <Skeleton className="h-3 w-12 shrink-0" />
                <div className="flex-1 space-y-space-1">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card className="flex h-full flex-col">
        <CardHeader>
          <CardTitle>Activity</CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          <EmptyState
            icon={Activity}
            title="No activity yet"
            description="Agent activity and system events will stream here in real time."
            className="py-8"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Activity</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <div
          ref={scrollRef}
          className="max-h-[400px] space-y-0 overflow-y-auto lg:max-h-none lg:h-full"
          role="log"
          aria-label="Activity feed"
          aria-live="polite"
        >
          {events.slice(0, 20).map((event) => (
            <div
              key={event.id}
              className="flex gap-space-2 border-b border-border-subtle px-space-1 py-space-2 last:border-b-0"
            >
              <span className="shrink-0 font-mono text-xs tabular-nums text-text-muted">
                {formatTimestamp(event.created_at)}
              </span>
              <p className="min-w-0 text-sm text-text-secondary">
                {formatEventDescription(event)}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
