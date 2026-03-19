"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { CostDailyTrend } from "@/lib/api/types";

interface DailyTrendChartProps {
  data: CostDailyTrend[];
  isLoading: boolean;
}

function formatCost(amount: number): string {
  return `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

export function DailyTrendChart({ data, isLoading }: DailyTrendChartProps) {
  if (isLoading) {
    return (
      <div className="rounded-md border border-border-subtle bg-bg-surface p-space-4">
        <Skeleton className="mb-space-3 h-4 w-32" />
        <div className="flex items-end gap-space-1" style={{ height: 160 }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton
              key={i}
              className="flex-1 rounded-t"
              style={{ height: `${30 + Math.random() * 70}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-md border border-border-subtle bg-bg-surface">
        <p className="text-sm text-text-muted">No cost data for this period</p>
      </div>
    );
  }

  const maxCost = Math.max(...data.map((d) => d.total_cost), 1);

  return (
    <div className="rounded-md border border-border-subtle bg-bg-surface p-space-4">
      <h3 className="mb-space-3 text-xs font-medium uppercase tracking-wider text-text-muted">
        Daily Trend
      </h3>

      {/* Chart area */}
      <div className="relative" style={{ height: 180 }}>
        {/* Y-axis labels */}
        <div
          className="absolute left-0 top-0 flex h-full flex-col justify-between text-right"
          style={{ width: 48 }}
          aria-hidden="true"
        >
          <span className="font-mono text-[10px] text-text-muted tabular-nums">
            {formatCost(maxCost)}
          </span>
          <span className="font-mono text-[10px] text-text-muted tabular-nums">
            {formatCost(maxCost / 2)}
          </span>
          <span className="font-mono text-[10px] text-text-muted tabular-nums">
            $0
          </span>
        </div>

        {/* Bars */}
        <div
          className="absolute bottom-5 top-0 right-0 flex items-end gap-space-1"
          style={{ left: 56 }}
          role="img"
          aria-label={`Daily cost trend showing ${data.length} days`}
        >
          {data.map((day) => {
            const heightPct = maxCost > 0 ? (day.total_cost / maxCost) * 100 : 0;
            return (
              <div
                key={day.date}
                className="group relative flex flex-1 flex-col items-center justify-end"
                style={{ height: "100%" }}
              >
                {/* Bar */}
                <div
                  className={cn(
                    "w-full rounded-t transition-colors",
                    "bg-accent-primary hover:bg-accent-hover",
                    "min-h-[2px]"
                  )}
                  style={{ height: `${Math.max(heightPct, 1)}%` }}
                />

                {/* Tooltip on hover */}
                <div className="pointer-events-none absolute bottom-full left-1/2 mb-space-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-bg-overlay px-space-2 py-space-1 text-xs shadow-lg group-hover:block">
                  <span className="font-mono tabular-nums text-text-primary">
                    ${day.total_cost.toFixed(2)}
                  </span>
                  <br />
                  <span className="text-text-muted">
                    {day.token_count.toLocaleString("en-US")} tokens
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* X-axis labels */}
        <div
          className="absolute bottom-0 right-0 flex"
          style={{ left: 56, height: 16 }}
          aria-hidden="true"
        >
          {data.map((day) => (
            <div
              key={day.date}
              className="flex-1 text-center font-mono text-[10px] text-text-muted"
            >
              {formatDate(day.date)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
