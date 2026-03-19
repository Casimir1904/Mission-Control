"use client";

import { useMemo } from "react";
import { HealthBanner } from "@/components/status/health-banner";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardOverview } from "@/lib/api/types";

interface HealthOverviewProps {
  data?: DashboardOverview;
  isLoading: boolean;
}

/**
 * Full-width health banner that summarizes overall system status.
 * Green = all agents online, Amber = some degraded, Red = any offline.
 */
export function HealthOverview({ data, isLoading }: HealthOverviewProps) {
  const { status, message } = useMemo(() => {
    if (!data) {
      return { status: "healthy" as const, message: "Loading system status..." };
    }

    const byStatus = data.agents_by_status;
    const offline = byStatus["offline"] ?? 0;
    const degraded = byStatus["degraded"] ?? 0;
    const total = Object.values(byStatus).reduce((sum, n) => sum + n, 0);

    if (total === 0) {
      return {
        status: "healthy" as const,
        message: "No agents configured yet",
      };
    }

    if (offline > 0) {
      return {
        status: "critical" as const,
        message: `${offline} agent${offline === 1 ? "" : "s"} offline`,
      };
    }

    if (degraded > 0) {
      return {
        status: "warning" as const,
        message: `${degraded} agent${degraded === 1 ? "" : "s"} need${degraded === 1 ? "s" : ""} attention`,
      };
    }

    return {
      status: "healthy" as const,
      message: "All systems operational",
    };
  }, [data]);

  if (isLoading) {
    return <Skeleton className="h-12 w-full rounded-md" />;
  }

  return (
    <HealthBanner
      status={status}
      message={message}
      actionLabel={status === "critical" ? "View agents" : undefined}
      actionHref={status === "critical" ? "/agents" : undefined}
    />
  );
}
