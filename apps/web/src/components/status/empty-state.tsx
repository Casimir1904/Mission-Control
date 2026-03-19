import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Warm, inviting empty state per DESIGN.md.
 * Used when a section has no data yet.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 text-center",
        className
      )}
    >
      <div className="mb-space-4 flex h-12 w-12 items-center justify-center rounded-md bg-bg-elevated">
        <Icon size={24} className="text-text-muted" aria-hidden="true" />
      </div>
      <h2 className="mb-space-1 text-base font-semibold text-text-primary">
        {title}
      </h2>
      <p className="mb-space-4 max-w-sm text-sm text-text-secondary">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}
