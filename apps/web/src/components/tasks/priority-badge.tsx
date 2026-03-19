import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskPriority } from "@/lib/api/types";

interface PriorityBadgeProps {
  priority: TaskPriority;
  className?: string;
}

const PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; bgClass: string; textClass: string; borderClass: string; showIcon: boolean }
> = {
  low: {
    label: "Low",
    bgClass: "bg-status-neutral/10",
    textClass: "text-status-neutral",
    borderClass: "border-status-neutral/30",
    showIcon: false,
  },
  medium: {
    label: "Medium",
    bgClass: "bg-status-info/10",
    textClass: "text-status-info",
    borderClass: "border-status-info/30",
    showIcon: false,
  },
  high: {
    label: "High",
    bgClass: "bg-status-warning/10",
    textClass: "text-status-warning",
    borderClass: "border-status-warning/30",
    showIcon: false,
  },
  critical: {
    label: "Critical",
    bgClass: "bg-status-critical/10",
    textClass: "text-status-critical",
    borderClass: "border-status-critical/30",
    showIcon: true,
  },
};

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority];

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
      {config.showIcon && (
        <AlertTriangle size={10} aria-hidden="true" />
      )}
      {config.label}
    </span>
  );
}
