"use client";

import { useRef, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/status/empty-state";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityEvent } from "@/lib/api/types";

interface ActivityStreamProps {
  events: ActivityEvent[];
  isLoading: boolean;
}

/**
 * Categorize event for icon and border color.
 */
type EventCategory = "tool" | "file" | "chat" | "state" | "task" | "approval" | "agent" | "default";

function categorizeEvent(event: ActivityEvent): EventCategory {
  const eventType = event.event_type;

  // Gateway / agent action events
  if (eventType === "agent.tool_use" || eventType === "gateway.tool_call") return "tool";
  if (eventType === "agent.file_write" || eventType === "gateway.file_write") return "file";
  if (eventType === "chat.message" || eventType === "agent.chat_response") return "chat";
  if (eventType === "agent.state_changed" || eventType === "agent.status_changed") return "state";
  if (eventType === "task.dispatched") return "state";

  // Standard events
  if (eventType.startsWith("task.")) return "task";
  if (eventType.startsWith("approval.")) return "approval";
  if (eventType.startsWith("agent.")) return "agent";

  return "default";
}

const CATEGORY_ICON: Record<EventCategory, string> = {
  tool: "\uD83D\uDD27",   // wrench
  file: "\uD83D\uDCC4",   // page
  chat: "\uD83D\uDCAC",   // speech bubble
  state: "\u26A1",         // zap
  task: "\u2705",          // check
  approval: "\uD83D\uDCCB", // clipboard
  agent: "\uD83E\uDD16",  // robot
  default: "\u2022",       // bullet
};

const CATEGORY_BORDER: Record<EventCategory, string> = {
  tool: "border-l-accent-primary",
  file: "border-l-status-info",
  chat: "border-l-accent-primary",
  state: "border-l-status-warning",
  task: "border-l-status-healthy",
  approval: "border-l-status-warning",
  agent: "border-l-status-info",
  default: "border-l-border-subtle",
};

/**
 * Format an event into a rich description with agent/task context.
 */
function formatEventDescription(event: ActivityEvent): { text: string; detail?: string } {
  const payload = event.payload ?? {};
  const agentName = (payload.agent_name as string) ?? "An agent";
  const taskTitle = (payload.task_title as string) ?? `Task #${event.entity_id?.slice(0, 6) ?? "?"}`;

  switch (event.event_type) {
    // Gateway / tool events
    case "agent.tool_use":
    case "gateway.tool_call": {
      const toolName = (payload.tool_name as string) ?? "tool";
      const toolArgs = (payload.args as string) ?? "";
      return {
        text: `${agentName} \u2192 ${toolName}`,
        detail: toolArgs ? `(${toolArgs.slice(0, 60)}${toolArgs.length > 60 ? "..." : ""})` : undefined,
      };
    }

    case "agent.file_write":
    case "gateway.file_write": {
      const fileName = (payload.file_name as string) ?? (payload.path as string) ?? "file";
      return {
        text: `${agentName} \u2192 wrote ${fileName}`,
      };
    }

    case "chat.message":
    case "agent.chat_response": {
      const sessionName = (payload.session_name as string) ?? "chat";
      return {
        text: `${agentName} responded in "${sessionName}"`,
      };
    }

    case "agent.state_changed": {
      const action = (payload.action as string) ?? (payload.status as string) ?? "unknown";
      return {
        text: `${agentName} ${action === "thinking" ? "started thinking" : action === "tool_use" ? "using tool" : action === "idle" ? "is idle" : `state: ${action}`}`,
      };
    }

    case "task.dispatched": {
      return {
        text: `${agentName} started working on ${taskTitle}`,
      };
    }

    case "task.transitioned":
      if (payload.to_status === "done") {
        return { text: `${agentName} completed ${taskTitle}` };
      }
      return {
        text: `${taskTitle} moved to ${String(payload.to_status ?? "unknown").replace("_", " ")}`,
      };

    case "task.created":
      return { text: `New task created: ${taskTitle}` };

    case "task.assigned":
      return { text: `${taskTitle} assigned to ${agentName}` };

    case "approval.submitted":
      return { text: `Approval needed: ${taskTitle}` };

    case "approval.reviewed":
      return { text: `Approval ${String(payload.status ?? "reviewed")}: ${taskTitle}` };

    case "agent.status_changed":
      if (payload.status === "offline") {
        return { text: `${agentName} went offline` };
      }
      if (payload.status === "online") {
        return { text: `${agentName} came online` };
      }
      return { text: `${agentName} status changed to ${String(payload.status ?? "unknown")}` };

    case "agent.heartbeat":
      return { text: `${agentName} heartbeat received` };

    case "board.created":
      return { text: `Board "${String(payload.board_name ?? event.entity_id)}" created` };

    default:
      return { text: `${event.entity_type}.${event.event_type}` };
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
 * Gateway events render with rich formatting and colored borders.
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
          {events.slice(0, 30).map((event, index) => {
            const category = categorizeEvent(event);
            const { text, detail } = formatEventDescription(event);
            const isNew = index === 0 && events.length > prevCountRef.current;

            return (
              <div
                key={event.id}
                className={cn(
                  "flex gap-space-2 border-b border-border-subtle border-l-2 px-space-2 py-space-2 last:border-b-0",
                  CATEGORY_BORDER[category],
                  isNew && "animate-slide-in-bottom"
                )}
              >
                <span className="shrink-0 font-mono text-xs tabular-nums text-text-muted">
                  {formatTimestamp(event.created_at)}
                </span>
                <span className="shrink-0 text-xs" aria-hidden="true">
                  {CATEGORY_ICON[category]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text-secondary">
                    {text}
                  </p>
                  {detail && (
                    <p className="mt-0.5 truncate font-mono text-xs text-text-muted">
                      {detail}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
