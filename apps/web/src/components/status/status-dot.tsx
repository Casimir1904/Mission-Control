import { cn } from "@/lib/utils";

type StatusVariant = "healthy" | "warning" | "critical" | "info" | "neutral";

interface StatusDotProps {
  variant: StatusVariant;
  label?: string;
  className?: string;
  size?: "sm" | "default";
}

const VARIANT_COLORS: Record<StatusVariant, string> = {
  healthy: "bg-status-healthy",
  warning: "bg-status-warning",
  critical: "bg-status-critical",
  info: "bg-status-info",
  neutral: "bg-status-neutral",
};

export function StatusDot({
  variant,
  label,
  className,
  size = "default",
}: StatusDotProps) {
  return (
    <span
      className={cn(
        "inline-block shrink-0 rounded-full",
        size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2",
        VARIANT_COLORS[variant],
        className
      )}
      role="img"
      aria-label={label ?? `Status: ${variant}`}
    />
  );
}
