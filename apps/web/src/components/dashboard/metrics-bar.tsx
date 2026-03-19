"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useCostSummary } from "@/lib/api/hooks";
import type { DashboardOverview } from "@/lib/api/types";

interface MetricsBarProps {
  data?: DashboardOverview;
  isLoading: boolean;
}

interface MetricItemProps {
  label: string;
  value: string | number;
  accent?: boolean;
  /** Subdued text shown after the value, e.g. "/15" */
  suffix?: string;
}

function MetricItem({ label, value, accent, suffix }: MetricItemProps) {
  return (
    <Card>
      <CardContent className="py-space-3 px-space-4">
        <p className="text-xs text-text-muted">{label}</p>
        <p
          className={cn(
            "mt-space-1 font-mono text-2xl font-semibold tabular-nums",
            accent ? "text-status-warning" : "text-text-primary"
          )}
        >
          {value}
          {suffix && (
            <span className="text-base font-normal text-text-muted">
              {suffix}
            </span>
          )}
        </p>
      </CardContent>
    </Card>
  );
}

function MetricItemSkeleton({ label }: { label: string }) {
  return (
    <Card>
      <CardContent className="py-space-3 px-space-4">
        <p className="text-xs text-text-muted">{label}</p>
        <Skeleton className="mt-space-1 h-8 w-16" />
      </CardContent>
    </Card>
  );
}

function formatCost(amount: number): string {
  return `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Horizontal bar of key operational metrics.
 * Large monospace numbers with small labels above.
 */
export function MetricsBar({ data, isLoading }: MetricsBarProps) {
  // Fetch today's cost from the cost summary API (1 day)
  const { data: costData, isLoading: costLoading } = useCostSummary({
    days: 1,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-space-3 md:grid-cols-4">
        <MetricItemSkeleton label="Tasks Today" />
        <MetricItemSkeleton label="Pending Approvals" />
        <MetricItemSkeleton label="Agents Online" />
        <MetricItemSkeleton label="Cost Today" />
      </div>
    );
  }

  const agentsByStatus = data?.agents_by_status ?? {};
  const onlineCount = agentsByStatus["online"] ?? 0;
  const totalAgents = Object.values(agentsByStatus).reduce(
    (sum, n) => sum + n,
    0
  );

  const pendingApprovals = data?.pending_approvals ?? 0;

  const todayCost =
    costLoading || !costData ? "--" : formatCost(costData.total_cost);

  return (
    <div className="grid grid-cols-2 gap-space-3 md:grid-cols-4">
      <MetricItem
        label="Tasks Today"
        value={data?.tasks_completed_today ?? 0}
      />
      <MetricItem
        label="Pending Approvals"
        value={pendingApprovals}
        accent={pendingApprovals > 0}
      />
      <MetricItem
        label="Agents Online"
        value={onlineCount}
        suffix={`/${totalAgents}`}
      />
      <MetricItem
        label="Cost Today"
        value={todayCost}
      />
    </div>
  );
}
