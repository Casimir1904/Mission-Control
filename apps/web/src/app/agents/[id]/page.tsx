"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot, Pencil, Trash2 } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusDot } from "@/components/status/status-dot";
import { EmptyState } from "@/components/status/empty-state";
import { useAgent, useDeleteAgent } from "@/lib/api/hooks";
import type { AgentStatus } from "@/lib/api/types";

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

function agentBadgeVariant(status: AgentStatus) {
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

export default function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: agent, isLoading } = useAgent(id);
  const deleteAgent = useDeleteAgent();

  function handleDelete() {
    deleteAgent.mutate(id, {
      onSuccess: () => router.push("/agents"),
    });
  }

  if (isLoading) {
    return (
      <DashboardShell>
        <div className="space-y-space-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
          <div className="grid gap-space-4 md:grid-cols-2">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (!agent) {
    return (
      <DashboardShell>
        <EmptyState
          icon={Bot}
          title="Agent not found"
          description="This agent may have been deleted or you may not have access."
          action={
            <Button asChild>
              <Link href="/agents">Back to Agents</Link>
            </Button>
          }
        />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <PageHeader
        title={agent.name}
        description={agent.role}
        breadcrumbs={[
          { label: "Agents", href: "/agents" },
          { label: agent.name },
        ]}
        action={
          <div className="flex items-center gap-space-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/agents/${id}/edit` as never}>
                <Pencil size={14} aria-hidden="true" />
                Edit
              </Link>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleteAgent.isPending}
            >
              <Trash2 size={14} aria-hidden="true" />
              {deleteAgent.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        }
      />

      {/* Status row */}
      <div className="flex items-center gap-space-4 pb-space-6">
        <div className="flex items-center gap-space-2">
          <StatusDot variant={agentStatusVariant(agent.status)} />
          <Badge variant={agentBadgeVariant(agent.status)}>
            {agent.status}
          </Badge>
        </div>
        {agent.board_name && (
          <Link
            href={`/boards/${agent.board_id}` as never}
            className="text-sm text-accent-primary hover:text-accent-hover transition-colors"
          >
            {agent.board_name}
          </Link>
        )}
        {agent.last_heartbeat && (
          <span className="font-mono text-xs text-text-muted tabular-nums">
            Last seen {new Date(agent.last_heartbeat).toLocaleString()}
          </span>
        )}
      </div>

      {/* Info cards */}
      <div className="grid gap-space-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Backstory</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-secondary whitespace-pre-wrap">
              {agent.backstory || "No backstory provided."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Goal</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-secondary whitespace-pre-wrap">
              {agent.goal || "No goal defined."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Task</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-secondary">
              {agent.current_task || "No active task."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-space-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-text-muted">ID</dt>
                <dd className="font-mono text-xs text-text-secondary tabular-nums">
                  {agent.id}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">Created</dt>
                <dd className="font-mono text-xs text-text-secondary tabular-nums">
                  {new Date(agent.created_at).toLocaleString()}
                </dd>
              </div>
              {agent.gateway_id && (
                <div className="flex justify-between">
                  <dt className="text-text-muted">Gateway</dt>
                  <dd className="font-mono text-xs text-text-secondary tabular-nums">
                    {agent.gateway_id}
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
