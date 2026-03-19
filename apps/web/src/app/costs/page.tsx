"use client";

import { useState } from "react";
import { DollarSign } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/status/empty-state";
import { CostSummaryCards } from "@/components/costs/cost-summary-cards";
import { DailyTrendChart } from "@/components/costs/daily-trend-chart";
import { CostBreakdownTable } from "@/components/costs/cost-breakdown-table";
import { useCostSummary } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";

type Period = 7 | 30 | 90;

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 7, label: "7d" },
  { value: 30, label: "30d" },
  { value: 90, label: "90d" },
];

export default function CostsPage() {
  const [days, setDays] = useState<Period>(7);
  const { data, isLoading } = useCostSummary({ days });

  const isEmpty =
    !isLoading &&
    data &&
    data.total_cost === 0 &&
    data.daily_trend.length === 0;

  return (
    <DashboardShell>
      <PageHeader
        title="Costs"
        description="LLM token usage and operational cost tracking"
        action={
          <div
            className="flex rounded-md border border-border-default"
            role="radiogroup"
            aria-label="Time period"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                role="radio"
                aria-checked={days === opt.value}
                onClick={() => setDays(opt.value)}
                className={cn(
                  "px-space-3 py-space-1 text-xs font-medium transition-colors first:rounded-l-md last:rounded-r-md",
                  days === opt.value
                    ? "bg-accent-primary text-white"
                    : "bg-bg-base text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        }
      />

      {isEmpty ? (
        <EmptyState
          icon={DollarSign}
          title="No cost data yet"
          description="Cost tracking breaks down LLM token usage by agent, board, and model. Start running agents to see cost metrics."
        />
      ) : (
        <div className="space-y-space-5">
          {/* Summary cards */}
          <CostSummaryCards data={data} isLoading={isLoading} />

          {/* Daily trend chart */}
          <DailyTrendChart
            data={data?.daily_trend ?? []}
            isLoading={isLoading}
          />

          {/* Breakdown table */}
          <div>
            <h3 className="mb-space-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
              Cost by Agent
            </h3>
            <CostBreakdownTable
              costByAgent={data?.cost_by_agent ?? {}}
              costByModel={data?.cost_by_model ?? {}}
              totalCost={data?.total_cost ?? 0}
              isLoading={isLoading}
            />
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
