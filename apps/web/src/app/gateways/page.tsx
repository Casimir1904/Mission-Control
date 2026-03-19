"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { Radio, Plus } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/status/empty-state";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { useGateways } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";
import type { Gateway } from "@/lib/api/types";

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
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

const columns: ColumnDef<Gateway, unknown>[] = [
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
    accessorKey: "url",
    header: "URL",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-text-secondary">
        {row.original.url}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const connected = row.original.status === "connected";
      return (
        <span className="inline-flex items-center gap-space-1">
          <span
            className={cn(
              "inline-block h-2 w-2 rounded-full",
              connected ? "bg-status-healthy" : "bg-status-critical"
            )}
            aria-hidden="true"
          />
          <span className="text-xs capitalize text-text-secondary">
            {row.original.status}
          </span>
        </span>
      );
    },
  },
  {
    accessorKey: "agent_count",
    header: "Agents",
    cell: ({ row }) => (
      <span className="font-mono tabular-nums text-text-primary">
        {row.original.agent_count}
      </span>
    ),
  },
  {
    accessorKey: "last_connected_at",
    header: "Last Connected",
    cell: ({ row }) => (
      <span className="font-mono text-xs tabular-nums text-text-muted">
        {timeAgo(row.original.last_connected_at)}
      </span>
    ),
  },
];

export default function GatewaysPage() {
  const router = useRouter();
  const { data, isLoading } = useGateways();
  const gateways = data?.items ?? [];
  const isEmpty = !isLoading && gateways.length === 0;

  const handleRowClick = useCallback(
    (gw: Gateway) => {
      router.push(`/gateways/${gw.id}`);
    },
    [router]
  );

  const addButton = (
    <Button onClick={() => router.push("/gateways/new")}>
      <Plus size={16} aria-hidden="true" />
      Add Gateway
    </Button>
  );

  return (
    <DashboardShell>
      <PageHeader
        title="Gateways"
        description="Manage gateway connections that bridge agents to Mission Control"
        action={!isEmpty ? addButton : undefined}
      />

      {isEmpty ? (
        <EmptyState
          icon={Radio}
          title="No gateways connected"
          description="Gateways run alongside your agents and connect them to Mission Control. Set up your first gateway to bring agents online."
          action={addButton}
        />
      ) : (
        <DataTable
          columns={columns}
          data={gateways}
          isLoading={isLoading}
          onRowClick={handleRowClick}
          pageSize={20}
        />
      )}
    </DashboardShell>
  );
}
