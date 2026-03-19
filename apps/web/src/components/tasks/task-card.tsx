"use client";

import { Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { PriorityBadge } from "./priority-badge";
import { StatusDot } from "@/components/status/status-dot";
import type { Task } from "@/lib/api/types";

interface TaskCardProps {
  task: Task;
  onClick?: (task: Task) => void;
  className?: string;
  /** Whether the agent assigned to this task is actively working */
  isAgentActive?: boolean;
}

export function TaskCard({ task, onClick, className, isAgentActive }: TaskCardProps) {
  const isInProgress = task.status === "in_progress";

  return (
    <div
      className={cn(
        "rounded-md border border-border-subtle bg-bg-surface p-space-3 transition-colors",
        "hover:border-border-default hover:bg-bg-elevated",
        onClick && "cursor-pointer",
        isInProgress && isAgentActive && "border-l-2 border-l-status-info",
        className
      )}
      onClick={() => onClick?.(task)}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick(task);
        }
      }}
      aria-label={`Task: ${task.title}`}
    >
      {/* Top row: title + priority */}
      <div className="flex items-start justify-between gap-space-2">
        <p className="line-clamp-2 text-sm font-medium text-text-primary">
          {task.title}
        </p>
        <PriorityBadge priority={task.priority} className="shrink-0" />
      </div>

      {/* Bottom row: assigned agent + activity indicator */}
      <div className="mt-space-2 flex items-center gap-space-1">
        {task.assigned_agent_name ? (
          <>
            {isInProgress && isAgentActive ? (
              <span
                className="inline-block h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-status-healthy"
                aria-label="Agent actively working"
              />
            ) : (
              <StatusDot variant="info" size="sm" />
            )}
            <span className="truncate text-xs text-text-secondary">
              {task.assigned_agent_name}
            </span>
            {isInProgress && isAgentActive && (
              <span className="ml-auto text-[10px] text-status-info">
                working
              </span>
            )}
          </>
        ) : null}
        {(task.deliverable_count ?? 0) > 0 && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[10px] text-text-muted font-mono tabular-nums",
              task.assigned_agent_name && "ml-auto"
            )}
            aria-label={`${task.deliverable_count} deliverables`}
          >
            <Paperclip size={10} aria-hidden="true" />
            {task.deliverable_count}
          </span>
        )}
      </div>
    </div>
  );
}
