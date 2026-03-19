"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskCard } from "@/components/tasks/task-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  KANBAN_STATUSES,
  getStatusLabel,
} from "@/components/tasks/status-badge";
import type { Task, TaskStatus } from "@/lib/api/types";

interface KanbanBoardProps {
  tasks: Task[];
  isLoading?: boolean;
  onTaskClick?: (task: Task) => void;
  onCreateTask?: (status: TaskStatus) => void;
}

export function KanbanBoard({
  tasks,
  isLoading = false,
  onTaskClick,
  onCreateTask,
}: KanbanBoardProps) {
  if (isLoading) {
    return <KanbanSkeleton />;
  }

  // Group tasks by status
  const grouped = KANBAN_STATUSES.reduce(
    (acc, status) => {
      acc[status] = tasks.filter((t) => t.status === status);
      return acc;
    },
    {} as Record<TaskStatus, Task[]>
  );

  return (
    <div
      className="flex gap-space-3 overflow-x-auto pb-space-4"
      role="region"
      aria-label="Task board"
    >
      {KANBAN_STATUSES.map((status) => (
        <KanbanColumn
          key={status}
          status={status}
          tasks={grouped[status] ?? []}
          onTaskClick={onTaskClick}
          onCreateTask={onCreateTask}
        />
      ))}
    </div>
  );
}

function KanbanColumn({
  status,
  tasks,
  onTaskClick,
  onCreateTask,
}: {
  status: TaskStatus;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onCreateTask?: (status: TaskStatus) => void;
}) {
  return (
    <div
      className="flex min-w-[280px] flex-1 flex-col rounded-md border border-border-subtle bg-bg-surface"
      role="group"
      aria-label={`${getStatusLabel(status)} column`}
    >
      {/* Column header */}
      <div className="flex items-center justify-between border-b border-border-subtle px-space-3 py-space-2">
        <div className="flex items-center gap-space-2">
          <h3 className="text-xs font-medium uppercase tracking-wider text-text-muted">
            {getStatusLabel(status)}
          </h3>
          <span className="rounded bg-bg-elevated px-space-1 py-0.5 font-mono text-[10px] text-text-muted tabular-nums">
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 space-y-space-2 overflow-y-auto p-space-2">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onClick={onTaskClick} />
        ))}

        {tasks.length === 0 && (
          <p className="py-space-8 text-center text-xs text-text-muted">
            No tasks
          </p>
        )}
      </div>

      {/* Add task button */}
      {onCreateTask && (
        <div className="border-t border-border-subtle p-space-2">
          <button
            onClick={() => onCreateTask(status)}
            className={cn(
              "flex w-full items-center justify-center gap-space-1 rounded-md px-space-2 py-space-2 text-xs text-text-muted transition-colors",
              "hover:bg-bg-elevated hover:text-text-secondary",
              "min-h-[36px]"
            )}
            aria-label={`Add task to ${getStatusLabel(status)}`}
          >
            <Plus size={14} aria-hidden="true" />
            Add task
          </button>
        </div>
      )}
    </div>
  );
}

function KanbanSkeleton() {
  return (
    <div className="flex gap-space-3 overflow-x-auto pb-space-4">
      {Array.from({ length: 5 }).map((_, colIdx) => (
        <div
          key={colIdx}
          className="flex min-w-[280px] flex-1 flex-col rounded-md border border-border-subtle bg-bg-surface"
        >
          <div className="flex items-center gap-space-2 border-b border-border-subtle px-space-3 py-space-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-6" />
          </div>
          <div className="space-y-space-2 p-space-2">
            {Array.from({ length: 3 - colIdx % 2 }).map((_, cardIdx) => (
              <div
                key={cardIdx}
                className="rounded-md border border-border-subtle p-space-3"
              >
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <div className="mt-space-2 flex items-center gap-space-1">
                  <Skeleton className="h-1.5 w-1.5 rounded-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
