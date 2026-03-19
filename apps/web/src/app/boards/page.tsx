"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { Kanban, Plus } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/status/empty-state";
import { StatusDot } from "@/components/status/status-dot";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { useBoards } from "@/lib/api/hooks";
import type { Board } from "@/lib/api/types";

const columns: ColumnDef<Board, unknown>[] = [
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
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <div className="flex items-center gap-space-2">
        <StatusDot
          variant={row.original.status === "active" ? "healthy" : "neutral"}
        />
        <span className="text-sm capitalize">{row.original.status}</span>
      </div>
    ),
  },
  {
    accessorKey: "agent_count",
    header: "Agents",
    cell: ({ row }) => (
      <span className="font-mono text-text-secondary tabular-nums">
        {row.original.agent_count}
      </span>
    ),
  },
  {
    id: "tasks",
    header: "Tasks",
    cell: ({ row }) => {
      const total = Object.values(row.original.task_counts).reduce(
        (sum, n) => sum + n,
        0
      );
      return (
        <span className="font-mono text-text-secondary tabular-nums">
          {total}
        </span>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-text-muted tabular-nums">
        {new Date(row.original.created_at).toLocaleDateString()}
      </span>
    ),
  },
];

export default function BoardsPage() {
  const router = useRouter();
  const { data, isLoading, isError } = useBoards();

  const boards = data?.items ?? [];

  return (
    <DashboardShell>
      <PageHeader
        title="Boards"
        description="Organize agents and tasks into mission boards"
        action={
          <Button asChild>
            <Link href={"/boards/new" as never}>
              <Plus size={16} aria-hidden="true" />
              New Board
            </Link>
          </Button>
        }
      />

      {isError && (
        <div className="rounded-md border border-status-critical/30 bg-status-critical/10 p-space-4 text-sm text-status-critical">
          Failed to load boards. The API server may not be running.
        </div>
      )}

      <DataTable
        columns={columns}
        data={boards}
        isLoading={isLoading}
        onRowClick={(board) => router.push(`/boards/${board.id}` as never)}
        emptyState={
          <EmptyState
            icon={Kanban}
            title="No boards yet"
            description="Create your first board to organize agents and tasks."
            action={
              <Button asChild>
                <Link href={"/boards/new" as never}>
                  <Plus size={16} aria-hidden="true" />
                  Create Board
                </Link>
              </Button>
            }
          />
        }
      />
    </DashboardShell>
  );
}
