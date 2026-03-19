"use client";

import { cn } from "@/lib/utils";
import { PriorityBadge } from "./priority-badge";
import { StatusDot } from "@/components/status/status-dot";
import type { Task } from "@/lib/api/types";

interface TaskCardProps {
  task: Task;
  onClick?: (task: Task) => void;
  className?: string;
}

export function TaskCard({ task, onClick, className }: TaskCardProps) {
  return (
    <div
      className={cn(
        "rounded-md border border-border-subtle bg-bg-surface p-space-3 transition-colors",
        "hover:border-border-default hover:bg-bg-elevated",
        onClick && "cursor-pointer",
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

      {/* Bottom row: assigned agent */}
      {task.assigned_agent_name && (
        <div className="mt-space-2 flex items-center gap-space-1">
          <StatusDot variant="info" size="sm" />
          <span className="truncate text-xs text-text-secondary">
            {task.assigned_agent_name}
          </span>
        </div>
      )}
    </div>
  );
}
