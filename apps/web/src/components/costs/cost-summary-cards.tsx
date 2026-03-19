"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CostSummary } from "@/lib/api/types";

interface CostSummaryCardsProps {
  data?: CostSummary;
  isLoading: boolean;
}

function formatCost(amount: number): string {
  return `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatTokens(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(0)}K`;
  }
  return count.toLocaleString("en-US");
}

function MetricSkeleton({ label }: { label: string }) {
  return (
    <Card>
      <CardContent className="py-space-3 px-space-4">
        <p className="text-xs text-text-muted">{label}</p>
        <Skeleton className="mt-space-1 h-8 w-20" />
      </CardContent>
    </Card>
  );
}

export function CostSummaryCards({ data, isLoading }: CostSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-space-3 sm:grid-cols-3">
        <MetricSkeleton label="Total Cost" />
        <MetricSkeleton label="Total Tokens" />
        <MetricSkeleton label="Models Used" />
      </div>
    );
  }

  const modelCount = data ? Object.keys(data.cost_by_model).length : 0;

  return (
    <div className="grid grid-cols-1 gap-space-3 sm:grid-cols-3">
      <Card>
        <CardContent className="py-space-3 px-space-4">
          <p className="text-xs text-text-muted">Total Cost</p>
          <p className="mt-space-1 font-mono text-2xl font-semibold tabular-nums text-text-primary">
            {formatCost(data?.total_cost ?? 0)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-space-3 px-space-4">
          <p className="text-xs text-text-muted">Total Tokens</p>
          <p className="mt-space-1 font-mono text-2xl font-semibold tabular-nums text-text-primary">
            {formatTokens(data?.total_tokens ?? 0)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-space-3 px-space-4">
          <p className="text-xs text-text-muted">Models Used</p>
          <p className="mt-space-1 font-mono text-2xl font-semibold tabular-nums text-text-primary">
            {modelCount}
            <span className="text-base font-normal text-text-muted">
              {" "}
              model{modelCount !== 1 ? "s" : ""}
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
