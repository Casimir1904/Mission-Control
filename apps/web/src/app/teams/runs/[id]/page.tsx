"use client";

import { use } from "react";
import Link from "next/link";
import { RefreshCw, XCircle, CheckCircle, Clock, AlertTriangle, ArrowRight } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/status/empty-state";
import { useTeamRun, useCancelTeamRun, useSyncTeamRun } from "@/lib/api/hooks";
import type { SubTask } from "@/lib/api/types";

function statusVariant(status: string) {
  switch (status) {
    case "completed":
    case "done":
      return "healthy" as const;
    case "running":
    case "in_progress":
      return "info" as const;
    case "pending":
    case "waiting":
      return "neutral" as const;
    case "failed":
    case "error":
      return "critical" as const;
    default:
      return "neutral" as const;
  }
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "completed":
    case "done":
      return <CheckCircle size={16} className="text-status-healthy" />;
    case "running":
    case "in_progress":
      return <RefreshCw size={16} className="animate-spin text-status-info" />;
    case "failed":
    case "error":
      return <AlertTriangle size={16} className="text-status-critical" />;
    default:
      return <Clock size={16} className="text-text-muted" />;
  }
}

export default function TeamRunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: run, isLoading } = useTeamRun(id);
  const cancelRun = useCancelTeamRun();
  const syncRun = useSyncTeamRun();

  if (isLoading) {
    return (
      <DashboardShell>
        <div className="space-y-space-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardShell>
    );
  }

  if (!run) {
    return (
      <DashboardShell>
        <EmptyState
          icon={RefreshCw}
          title="Run not found"
          description="This team run may no longer exist."
          action={
            <Button asChild>
              <Link href={"/teams" as never}>Back to Teams</Link>
            </Button>
          }
        />
      </DashboardShell>
    );
  }

  const isActive = run.status === "pending" || run.status === "running";

  return (
    <DashboardShell>
      <PageHeader
        title={`${run.team_name} Run`}
        description={run.task}
        breadcrumbs={[
          { label: "Teams", href: "/teams" },
          { label: run.team_name },
        ]}
        action={
          <div className="flex items-center gap-space-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncRun.mutate(id)}
              disabled={syncRun.isPending}
            >
              <RefreshCw
                size={14}
                className={syncRun.isPending ? "animate-spin" : ""}
                aria-hidden="true"
              />
              Sync
            </Button>
            {isActive && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => cancelRun.mutate(id)}
                disabled={cancelRun.isPending}
                className="text-status-critical hover:text-status-critical"
              >
                <XCircle size={14} aria-hidden="true" />
                Cancel
              </Button>
            )}
          </div>
        }
      />

      <div className="flex items-center gap-space-4 pb-space-4">
        <Badge variant={statusVariant(run.status)}>{run.status}</Badge>
        {run.started_at && (
          <span className="font-mono text-xs text-text-muted tabular-nums">
            Started {new Date(run.started_at).toLocaleString()}
          </span>
        )}
        {run.ended_at && (
          <span className="font-mono text-xs text-text-muted tabular-nums">
            Ended {new Date(run.ended_at).toLocaleString()}
          </span>
        )}
      </div>

      {run.result && (
        <Card className="mb-space-4">
          <CardHeader>
            <CardTitle className="text-sm">Result</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-text-secondary">
              {run.result}
            </p>
          </CardContent>
        </Card>
      )}

      <h3 className="mb-space-3 text-sm font-medium text-text-primary">
        Sub-tasks ({run.sub_tasks?.length ?? 0})
      </h3>

      {!run.sub_tasks || run.sub_tasks.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No sub-tasks yet"
          description={
            isActive
              ? "ClawTeam is decomposing the task..."
              : "This run produced no sub-tasks."
          }
        />
      ) : (
        <div className="space-y-space-2">
          {run.sub_tasks.map((st: SubTask) => (
            <Card key={st.id}>
              <CardContent className="flex items-center gap-space-3 py-space-3">
                <StatusIcon status={st.status} />
                <div className="flex-1">
                  <div className="flex items-center gap-space-2">
                    <span className="text-sm font-medium text-text-primary">
                      {st.title}
                    </span>
                    <Badge variant="neutral" className="text-xs">
                      {st.agent}
                    </Badge>
                    <Badge variant={statusVariant(st.status)} className="text-xs">
                      {st.status}
                    </Badge>
                  </div>
                  {st.depends_on && st.depends_on.length > 0 && (
                    <div className="mt-space-1 flex items-center gap-space-1 text-xs text-text-muted">
                      <ArrowRight size={10} aria-hidden="true" />
                      Depends on: {st.depends_on.join(", ")}
                    </div>
                  )}
                  {st.result && (
                    <p className="mt-space-1 text-xs text-text-secondary">
                      {st.result}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
