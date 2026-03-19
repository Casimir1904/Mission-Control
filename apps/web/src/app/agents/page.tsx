"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { Bot, Plus } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/status/empty-state";
import { StatusDot } from "@/components/status/status-dot";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { useAgents } from "@/lib/api/hooks";
import type { Agent, AgentStatus } from "@/lib/api/types";

function agentStatusVariant(status: AgentStatus) {
  switch (status) {
    case "online":
      return "healthy" as const;
    case "degraded":
      return "warning" as const;
    case "offline":
      return "critical" as const;
    case "provisioning":
      return "neutral" as const;
  }
}

const columns: ColumnDef<Agent, unknown>[] = [
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <StatusDot
        variant={agentStatusVariant(row.original.status)}
        label={row.original.status}
      />
    ),
    enableSorting: false,
  },
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
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => (
      <span className="text-text-secondary">{row.original.role}</span>
    ),
  },
  {
    accessorKey: "board_name",
    header: "Board",
    cell: ({ row }) => (
      <span className="text-text-secondary">
        {row.original.board_name ?? "--"}
      </span>
    ),
  },
  {
    accessorKey: "current_task",
    header: "Current Task",
    cell: ({ row }) => (
      <span className="max-w-[200px] truncate text-text-secondary">
        {row.original.current_task ?? "--"}
      </span>
    ),
  },
  {
    accessorKey: "last_heartbeat",
    header: "Last Seen",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-text-muted tabular-nums">
        {row.original.last_heartbeat
          ? new Date(row.original.last_heartbeat).toLocaleString()
          : "Never"}
      </span>
    ),
  },
];

export default function AgentsPage() {
  const router = useRouter();
  const { data, isLoading, isError } = useAgents();

  const agents = data?.items ?? [];

  return (
    <DashboardShell>
      <PageHeader
        title="Agents"
        description="Monitor and manage all registered AI agents"
        action={
          <Button asChild>
            <Link href={"/agents/new" as never}>
              <Plus size={16} aria-hidden="true" />
              New Agent
            </Link>
          </Button>
        }
      />

      {isError && (
        <div className="rounded-md border border-status-critical/30 bg-status-critical/10 p-space-4 text-sm text-status-critical">
          Failed to load agents. The API server may not be running.
        </div>
      )}

      <DataTable
        columns={columns}
        data={agents}
        isLoading={isLoading}
        onRowClick={(agent) => router.push(`/agents/${agent.id}` as never)}
        emptyState={
          <EmptyState
            icon={Bot}
            title="No agents registered"
            description="Agents connect through gateways and appear here automatically. Register your first agent to get started."
            action={
              <Button asChild>
                <Link href={"/agents/new" as never}>
                  <Plus size={16} aria-hidden="true" />
                  Register Agent
                </Link>
              </Button>
            }
          />
        }
      />
    </DashboardShell>
  );
}
