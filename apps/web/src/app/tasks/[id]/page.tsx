"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ListTodo, Pencil, Trash2, ArrowRight } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/status/empty-state";
import { StatusBadge } from "@/components/tasks/status-badge";
import { PriorityBadge } from "@/components/tasks/priority-badge";
import { useTask, useDeleteTask, useTransitionTask } from "@/lib/api/hooks";
import type { TaskStatus } from "@/lib/api/types";

// Valid next statuses for each current status
const TRANSITIONS: Record<string, TaskStatus[]> = {
  backlog: ["todo"],
  todo: ["in_progress", "blocked"],
  in_progress: ["review", "blocked", "todo"],
  review: ["approved", "rejected"],
  approved: ["done"],
  rejected: ["in_progress"],
  blocked: ["todo", "in_progress"],
  done: [],
};

export default function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: task, isLoading, error } = useTask(id);
  const deleteTask = useDeleteTask();
  const transitionTask = useTransitionTask();

  if (isLoading) {
    return (
      <DashboardShell>
        <div className="space-y-space-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <div className="grid gap-space-4 md:grid-cols-2">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (error || !task) {
    return (
      <DashboardShell>
        <EmptyState
          icon={ListTodo}
          title="Task not found"
          description="This task may have been deleted or you don't have access to it."
          action={
            <Button asChild>
              <Link href="/tasks">Back to Tasks</Link>
            </Button>
          }
        />
      </DashboardShell>
    );
  }

  const nextStatuses = TRANSITIONS[task.status] ?? [];

  const handleTransition = (status: TaskStatus) => {
    transitionTask.mutate(
      { id: task.id, data: { status } },
      { onError: () => {} }
    );
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this task?")) {
      deleteTask.mutate(task.id, {
        onSuccess: () => router.push("/tasks"),
      });
    }
  };

  return (
    <DashboardShell>
      <PageHeader
        title={task.title}
        breadcrumbs={[
          { label: "Tasks", href: "/tasks" },
          { label: task.title },
        ]}
        action={
          <div className="flex items-center gap-space-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/tasks/${id}/edit` as never}>
                <Pencil className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Edit
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={handleDelete}>
              <Trash2 className="mr-1.5 h-4 w-4" />
              Delete
            </Button>
          </div>
        }
      />

      <div className="grid gap-space-4 md:grid-cols-2">
        {/* Status & Priority */}
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-space-4">
            <div className="flex items-center gap-space-3">
              <span className="text-sm text-text-secondary">Current:</span>
              <StatusBadge status={task.status} />
            </div>
            <div className="flex items-center gap-space-3">
              <span className="text-sm text-text-secondary">Priority:</span>
              <PriorityBadge priority={task.priority} />
            </div>

            {nextStatuses.length > 0 && (
              <div className="pt-space-3 border-t border-border-subtle">
                <p className="text-xs text-text-muted mb-space-2">
                  Transition to:
                </p>
                <div className="flex flex-wrap gap-space-2">
                  {nextStatuses.map((status) => (
                    <Button
                      key={status}
                      variant="outline"
                      size="sm"
                      onClick={() => handleTransition(status)}
                      disabled={transitionTask.isPending}
                    >
                      <ArrowRight className="mr-1 h-3 w-3" />
                      {status.replace(/_/g, " ")}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-space-3">
            {task.description && (
              <div>
                <span className="text-xs text-text-muted block mb-1">
                  Description
                </span>
                <p className="text-sm text-text-primary whitespace-pre-wrap">
                  {task.description}
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-space-3 text-sm">
              <div>
                <span className="text-text-muted block text-xs">Board</span>
                <span className="text-text-secondary font-mono">
                  {task.board_id ? (
                    <Link
                      href={`/boards/${task.board_id}` as never}
                      className="text-accent-primary hover:underline"
                    >
                      View Board
                    </Link>
                  ) : (
                    "—"
                  )}
                </span>
              </div>
              <div>
                <span className="text-text-muted block text-xs">Agent</span>
                <span className="text-text-secondary font-mono">
                  {task.assigned_agent_id ? (
                    <Link
                      href={`/agents/${task.assigned_agent_id}` as never}
                      className="text-accent-primary hover:underline"
                    >
                      View Agent
                    </Link>
                  ) : (
                    "Unassigned"
                  )}
                </span>
              </div>
              <div>
                <span className="text-text-muted block text-xs">Created</span>
                <span className="text-text-secondary font-mono text-xs">
                  {new Date(task.created_at).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-text-muted block text-xs">ID</span>
                <span className="text-text-secondary font-mono text-xs">
                  {task.id.slice(0, 8)}…
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
