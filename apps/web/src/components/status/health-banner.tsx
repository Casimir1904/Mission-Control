import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

type HealthStatus = "healthy" | "warning" | "critical";

interface HealthBannerProps {
  status: HealthStatus;
  message: string;
  actionLabel?: string;
  actionHref?: string;
}

const BANNER_CONFIG: Record<
  HealthStatus,
  { gradient: string; icon: typeof CheckCircle2 }
> = {
  healthy: {
    gradient: "from-status-healthy/20 to-transparent",
    icon: CheckCircle2,
  },
  warning: {
    gradient: "from-status-warning/20 to-transparent",
    icon: AlertTriangle,
  },
  critical: {
    gradient: "from-status-critical/20 to-transparent",
    icon: XCircle,
  },
};

export function HealthBanner({
  status,
  message,
  actionLabel,
  actionHref,
}: HealthBannerProps) {
  const config = BANNER_CONFIG[status];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex h-12 items-center gap-space-3 rounded-md bg-gradient-to-r px-space-4",
        config.gradient
      )}
      role="status"
      aria-live="polite"
    >
      <Icon size={18} className="shrink-0" aria-hidden="true" />
      <span className="flex-1 text-sm text-text-primary">{message}</span>
      {actionLabel && actionHref && (
        <a
          href={actionHref}
          className="text-sm font-medium text-accent-primary transition-colors hover:text-accent-hover"
        >
          {actionLabel} &rarr;
        </a>
      )}
    </div>
  );
}
