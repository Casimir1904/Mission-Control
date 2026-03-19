"use client";

import { useState, useMemo, useCallback } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/status/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useActivity } from "@/lib/api/hooks";
import type { ActivityEvent, ActivityListParams } from "@/lib/api/types";
import {
  Activity,
  Bot,
  CheckSquare,
  Kanban,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

const ENTITY_FILTERS: { label: string; value: string | "all"; icon: LucideIcon }[] = [
  { label: "All", value: "all", icon: Activity },
  { label: "Agents", value: "agent", icon: Bot },
  { label: "Tasks", value: "task", icon: CheckSquare },
  { label: "Boards", value: "board", icon: Kanban },
  { label: "Approvals", value: "approval", icon: ShieldCheck },
];

const ENTITY_ICON_MAP: Record<string, LucideIcon> = {
  agent: Bot,
  task: CheckSquare,
  board: Kanban,
  approval: ShieldCheck,
};

function formatEventDescription(event: ActivityEvent): string {
  const payload = event.payload ?? {};
  const agentName = (payload.agent_name as string) ?? "An agent";
  const taskTitle =
    (payload.task_title as string) ??
    `Task #${event.entity_id?.slice(0, 6) ?? "?"}`;

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
      if (payload.status === "offline") return `${agentName} went offline`;
      if (payload.status === "online") return `${agentName} came online`;
      return `${agentName} status changed to ${String(payload.status ?? "unknown")}`;

    case "agent.heartbeat":
      return `${agentName} heartbeat received`;

    case "board.created":
      return `Board "${String(payload.board_name ?? event.entity_id)}" created`;

    default:
      return `${event.entity_type}.${event.event_type}`;
  }
}

function formatFullTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return "--";
  }
}

export default function ActivityPage() {
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const params: ActivityListParams = useMemo(
    () => ({
      page,
      per_page: 30,
      ...(entityFilter !== "all" ? { entity_type: entityFilter } : {}),
    }),
    [page, entityFilter]
  );

  const { data, isLoading } = useActivity(params);

  const events = data?.items ?? [];
  const totalPages = data ? Math.ceil(data.total / data.per_page) : 1;

  const handleFilterChange = useCallback((value: string) => {
    setEntityFilter(value);
    setPage(1);
  }, []);

  return (
    <DashboardShell>
      <PageHeader
        title="Activity"
        description="Full timeline of system events across all boards and agents"
      />

      {/* Entity type filter */}
      <div
        className="mb-space-4 flex gap-space-1"
        role="tablist"
        aria-label="Filter by entity type"
      >
        {ENTITY_FILTERS.map((opt) => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              onClick={() => handleFilterChange(opt.value)}
              role="tab"
              aria-selected={entityFilter === opt.value}
              className={cn(
                "inline-flex items-center gap-space-1 rounded-md px-space-3 py-space-1 text-xs font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong",
                entityFilter === opt.value
                  ? "bg-bg-elevated text-text-primary"
                  : "text-text-muted hover:bg-bg-elevated hover:text-text-secondary"
              )}
            >
              <Icon size={12} aria-hidden="true" />
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Event timeline */}
      {isLoading ? (
        <div className="space-y-0 rounded-md border border-border-subtle bg-bg-surface">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="flex items-start gap-space-3 border-b border-border-subtle px-space-4 py-space-3 last:border-b-0"
            >
              <Skeleton className="mt-0.5 h-5 w-5 rounded-md" />
              <div className="flex-1 space-y-space-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={Activity}
          title={
            entityFilter === "all"
              ? "No activity yet"
              : `No ${entityFilter} activity`
          }
          description="System events and agent activity will appear here as they happen."
        />
      ) : (
        <div className="rounded-md border border-border-subtle bg-bg-surface">
          {events.map((event) => {
            const Icon =
              ENTITY_ICON_MAP[event.entity_type] ?? Activity;
            return (
              <div
                key={event.id}
                className="flex items-start gap-space-3 border-b border-border-subtle px-space-4 py-space-3 last:border-b-0"
              >
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-bg-elevated">
                  <Icon
                    size={12}
                    className="text-text-muted"
                    aria-hidden="true"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text-primary">
                    {formatEventDescription(event)}
                  </p>
                  <p className="mt-space-1 font-mono text-xs tabular-nums text-text-muted">
                    {formatFullTimestamp(event.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-space-4 flex items-center justify-between">
          <p className="text-xs text-text-muted">
            Page{" "}
            <span className="font-mono tabular-nums">{page}</span> of{" "}
            <span className="font-mono tabular-nums">{totalPages}</span>
          </p>
          <div className="flex gap-space-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
