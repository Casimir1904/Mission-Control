"use client";

import { Suspense, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { ListTodo, Plus } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/status/empty-state";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/tasks/status-badge";
import { PriorityBadge } from "@/components/tasks/priority-badge";
import { useTasks, useBoards } from "@/lib/api/hooks";
import type { Task, TaskStatus, TaskPriority } from "@/lib/api/types";

const ALL_STATUSES: TaskStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "review",
  "approved",
  "rejected",
  "done",
  "blocked",
];

const ALL_PRIORITIES: TaskPriority[] = ["low", "medium", "high", "critical"];

const columns: ColumnDef<Task, unknown>[] = [
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => (
      <span className="max-w-[300px] truncate font-medium text-text-primary">
        {row.original.title}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
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
    accessorKey: "assigned_agent_name",
    header: "Agent",
    cell: ({ row }) => (
      <span className="text-text-secondary">
        {row.original.assigned_agent_name ?? "Unassigned"}
      </span>
    ),
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

export default function TasksPage() {
  return (
    <Suspense
      fallback={
        <DashboardShell>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-space-4 h-96 w-full" />
        </DashboardShell>
      }
    >
      <TasksContent />
    </Suspense>
  );
}

function TasksContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const statusFilter = searchParams.get("status") as TaskStatus | null;
  const priorityFilter = searchParams.get("priority") as TaskPriority | null;
  const boardFilter = searchParams.get("board_id") ?? undefined;

  const { data, isLoading, isError } = useTasks({
    status: statusFilter ?? undefined,
    priority: priorityFilter ?? undefined,
    board_id: boardFilter,
  });
  const { data: boardsData } = useBoards();

  const tasks = data?.items ?? [];
  const boards = boardsData?.items ?? [];

  const setFilter = useCallback(
    (key: string, value: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.replace(`/tasks?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <DashboardShell>
      <PageHeader
        title="Tasks"
        description="View and manage tasks across all boards"
        action={
          <Button asChild>
            <Link href={"/tasks/new" as never}>
              <Plus size={16} aria-hidden="true" />
              New Task
            </Link>
          </Button>
        }
      />

      {isError && (
        <div className="rounded-md border border-status-critical/30 bg-status-critical/10 p-space-4 text-sm text-status-critical">
          Failed to load tasks. The API server may not be running.
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-space-3 pb-space-4">
        <Select
          value={statusFilter ?? "all"}
          onValueChange={(val) =>
            setFilter("status", val === "all" ? undefined : val)
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {ALL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={priorityFilter ?? "all"}
          onValueChange={(val) =>
            setFilter("priority", val === "all" ? undefined : val)
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {ALL_PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={boardFilter ?? "all"}
          onValueChange={(val) =>
            setFilter("board_id", val === "all" ? undefined : val)
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Boards" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Boards</SelectItem>
            {boards.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={tasks}
        isLoading={isLoading}
        onRowClick={(task) => router.push(`/tasks/${task.id}` as never)}
        emptyState={
          <EmptyState
            icon={ListTodo}
            title="No tasks found"
            description={
              statusFilter || priorityFilter || boardFilter
                ? "No tasks match the current filters. Try adjusting your filters."
                : "Tasks are work items assigned to agents. Create a board first, then add tasks for your agents to work on."
            }
            action={
              !statusFilter && !priorityFilter && !boardFilter ? (
                <Button asChild>
                  <Link href={"/tasks/new" as never}>
                    <Plus size={16} aria-hidden="true" />
                    Create Task
                  </Link>
                </Button>
              ) : undefined
            }
          />
        }
      />
    </DashboardShell>
  );
}
