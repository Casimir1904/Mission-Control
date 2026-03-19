"use client";

import { useState, useCallback } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { SpanWaterfall } from "./span-waterfall";
import { useTrace } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";
import type { Trace } from "@/lib/api/types";

interface TraceListProps {
  traces: Trace[];
  isLoading: boolean;
}

const STATUS_DOTS: Record<string, string> = {
  ok: "bg-status-healthy",
  error: "bg-status-critical",
  running: "bg-status-info",
};

function formatCost(amount: number): string {
  return `$${amount.toFixed(4)}`;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

const columns: ColumnDef<Trace, unknown>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <span className="font-medium text-text-primary">
        {row.original.name}
      </span>
    ),
  },
  {
    accessorKey: "agent_id",
    header: "Agent",
    cell: ({ row }) => (
      <span className="text-text-secondary">{row.original.agent_id}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      const dotColor = STATUS_DOTS[status] ?? "bg-status-neutral";
      return (
        <span className="inline-flex items-center gap-space-1">
          <span
            className={cn("inline-block h-2 w-2 rounded-full", dotColor)}
            aria-hidden="true"
          />
          <span className="text-xs capitalize text-text-secondary">
            {status}
          </span>
        </span>
      );
    },
  },
  {
    accessorKey: "duration_ms",
    header: "Duration",
    cell: ({ row }) => (
      <span className="font-mono tabular-nums text-text-primary">
        {row.original.duration_ms.toFixed(0)}ms
      </span>
    ),
  },
  {
    accessorKey: "token_count",
    header: "Tokens",
    cell: ({ row }) => (
      <span className="font-mono tabular-nums text-text-primary">
        {row.original.token_count.toLocaleString("en-US")}
      </span>
    ),
  },
  {
    accessorKey: "cost",
    header: "Cost",
    cell: ({ row }) => (
      <span className="font-mono tabular-nums text-text-primary">
        {formatCost(row.original.cost)}
      </span>
    ),
  },
  {
    accessorKey: "created_at",
    header: "Time",
    cell: ({ row }) => (
      <span className="font-mono text-xs tabular-nums text-text-muted">
        {timeAgo(row.original.created_at)}
      </span>
    ),
  },
];

function TraceDetail({ traceId }: { traceId: string }) {
  const { data: trace, isLoading } = useTrace(traceId);

  if (isLoading) {
    return (
      <div className="p-space-4">
        <div className="h-48 animate-pulse rounded-md bg-bg-elevated" />
      </div>
    );
  }

  if (!trace?.spans || trace.spans.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center text-sm text-text-muted">
        No span data available
      </div>
    );
  }

  return (
    <div className="p-space-4">
      <SpanWaterfall
        spans={trace.spans}
        traceDurationMs={trace.duration_ms}
      />
    </div>
  );
}

export function TraceList({ traces, isLoading }: TraceListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleRowClick = useCallback(
    (trace: Trace) => {
      setExpandedId((prev) => (prev === trace.id ? null : trace.id));
    },
    []
  );

  return (
    <div>
      <DataTable
        columns={columns}
        data={traces}
        isLoading={isLoading}
        onRowClick={handleRowClick}
        emptyState={null}
        pageSize={20}
      />

      {/* Expanded trace detail */}
      {expandedId && (
        <div className="mt-space-3">
          <TraceDetail traceId={expandedId} />
        </div>
      )}
    </div>
  );
}
