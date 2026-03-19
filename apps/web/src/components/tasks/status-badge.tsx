import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/lib/api/types";

interface StatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; dotClass: string; bgClass: string; textClass: string; borderClass: string }
> = {
  backlog: {
    label: "Backlog",
    dotClass: "bg-status-neutral",
    bgClass: "bg-status-neutral/10",
    textClass: "text-status-neutral",
    borderClass: "border-status-neutral/30",
  },
  todo: {
    label: "To Do",
    dotClass: "bg-status-info",
    bgClass: "bg-status-info/10",
    textClass: "text-status-info",
    borderClass: "border-status-info/30",
  },
  in_progress: {
    label: "In Progress",
    dotClass: "bg-status-info animate-pulse",
    bgClass: "bg-accent-muted",
    textClass: "text-accent-primary",
    borderClass: "border-accent-primary/30",
  },
  review: {
    label: "Review",
    dotClass: "bg-status-warning",
    bgClass: "bg-status-warning/10",
    textClass: "text-status-warning",
    borderClass: "border-status-warning/30",
  },
  approved: {
    label: "Approved",
    dotClass: "bg-status-healthy",
    bgClass: "bg-status-healthy/10",
    textClass: "text-status-healthy",
    borderClass: "border-status-healthy/30",
  },
  rejected: {
    label: "Rejected",
    dotClass: "bg-status-critical",
    bgClass: "bg-status-critical/10",
    textClass: "text-status-critical",
    borderClass: "border-status-critical/30",
  },
  done: {
    label: "Done",
    dotClass: "bg-status-healthy",
    bgClass: "bg-status-healthy/10",
    textClass: "text-status-healthy",
    borderClass: "border-status-healthy/30",
  },
  blocked: {
    label: "Blocked",
    dotClass: "bg-status-critical",
    bgClass: "bg-status-critical/10",
    textClass: "text-status-critical",
    borderClass: "border-dashed border-status-critical/30",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-space-1 rounded-md border px-space-2 py-0.5 text-xs font-medium",
        config.bgClass,
        config.textClass,
        config.borderClass,
        className
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 shrink-0 rounded-full", config.dotClass)}
        aria-hidden="true"
      />
      {config.label}
    </span>
  );
}

/** Visible statuses for Kanban columns (ordered) */
export const KANBAN_STATUSES: TaskStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "review",
  "done",
];

/** Human-readable label for a status */
export function getStatusLabel(status: TaskStatus): string {
  return STATUS_CONFIG[status]?.label ?? status;
}
