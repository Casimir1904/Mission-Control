"use client";

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface CostBreakdownTableProps {
  costByAgent: Record<string, number>;
  costByModel: Record<string, number>;
  totalCost: number;
  isLoading: boolean;
}

function formatCost(amount: number): string {
  return `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function CostTableSkeleton() {
  return (
    <div className="rounded-md border border-border-subtle bg-bg-surface">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Agent</TableHead>
            <TableHead>Cost</TableHead>
            <TableHead>% Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 4 }).map((_, i) => (
            <TableRow key={i} className="hover:bg-transparent">
              <TableCell>
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-12" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function CostBreakdownTable({
  costByAgent,
  costByModel,
  totalCost,
  isLoading,
}: CostBreakdownTableProps) {
  if (isLoading) {
    return <CostTableSkeleton />;
  }

  // Merge agent data with model data for a richer table
  // For now, show cost by agent with percentage
  const agentEntries = Object.entries(costByAgent)
    .sort(([, a], [, b]) => b - a);

  if (agentEntries.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-md border border-border-subtle bg-bg-surface">
        <p className="text-sm text-text-muted">No agent cost data yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border-subtle bg-bg-surface">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Agent</TableHead>
            <TableHead className="text-right">Cost</TableHead>
            <TableHead className="text-right">% Total</TableHead>
            <TableHead className="w-32" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {agentEntries.map(([agent, cost]) => {
            const pct = totalCost > 0 ? (cost / totalCost) * 100 : 0;
            return (
              <TableRow key={agent}>
                <TableCell className="font-medium text-text-primary">
                  {agent}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-text-primary">
                  {formatCost(cost)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-text-secondary">
                  {pct.toFixed(0)}%
                </TableCell>
                <TableCell>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-elevated">
                    <div
                      className="h-full rounded-full bg-accent-primary transition-all"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Model breakdown footer */}
      {Object.keys(costByModel).length > 0 && (
        <div className="border-t border-border-subtle px-space-3 py-space-2">
          <p className="mb-space-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            By Model
          </p>
          <div className="flex flex-wrap gap-space-3">
            {Object.entries(costByModel)
              .sort(([, a], [, b]) => b - a)
              .map(([model, cost]) => (
                <span
                  key={model}
                  className="text-xs text-text-secondary"
                >
                  <span className="font-medium text-text-primary">{model}</span>{" "}
                  <span className="font-mono tabular-nums">
                    {formatCost(cost)}
                  </span>
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
