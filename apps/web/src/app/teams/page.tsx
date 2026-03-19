"use client";

import { useRouter } from "next/navigation";
import { Users, Play, RefreshCw } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/status/empty-state";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { useTeamTemplates, useTeamRuns } from "@/lib/api/hooks";

function statusVariant(status: string) {
  switch (status) {
    case "completed":
      return "healthy" as const;
    case "running":
      return "info" as const;
    case "pending":
      return "neutral" as const;
    case "failed":
      return "critical" as const;
    default:
      return "neutral" as const;
  }
}

export default function TeamsPage() {
  const router = useRouter();
  const { data: templates, isLoading: templatesLoading } = useTeamTemplates();
  const { data: runs, isLoading: runsLoading } = useTeamRuns();

  return (
    <DashboardShell>
      <PageHeader
        title="Teams"
        description="ClawTeam swarm intelligence — team templates and active runs."
        action={
          <Button size="sm" onClick={() => router.push("/teams/new" as never)}>
            <Play size={14} aria-hidden="true" />
            New Run
          </Button>
        }
      />

      <Tabs defaultValue="runs">
        <TabsList>
          <TabsTrigger value="runs">
            <RefreshCw size={14} className="mr-space-1" aria-hidden="true" />
            Runs
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Users size={14} className="mr-space-1" aria-hidden="true" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="runs">
          {runsLoading ? (
            <div className="space-y-space-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !runs || runs.length === 0 ? (
            <EmptyState
              icon={RefreshCw}
              title="No team runs"
              description="Start a team run to see ClawTeam agents collaborate on tasks."
              action={
                <Button onClick={() => router.push("/teams/new" as never)}>
                  <Play size={16} aria-hidden="true" />
                  Start Run
                </Button>
              }
            />
          ) : (
            <div className="rounded-md border border-border-subtle bg-bg-surface">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Status</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Sub-tasks</TableHead>
                    <TableHead>Started</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((run) => (
                    <TableRow
                      key={run.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/teams/runs/${run.id}` as never)}
                    >
                      <TableCell>
                        <Badge variant={statusVariant(run.status)}>
                          {run.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{run.team_name}</TableCell>
                      <TableCell className="max-w-xs truncate text-text-secondary">
                        {run.task}
                      </TableCell>
                      <TableCell className="font-mono text-xs tabular-nums">
                        {run.sub_tasks?.length ?? 0}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-text-muted tabular-nums">
                        {run.started_at
                          ? new Date(run.started_at).toLocaleString()
                          : "\u2014"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates">
          {templatesLoading ? (
            <div className="grid gap-space-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-40 w-full" />
              ))}
            </div>
          ) : !templates || templates.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No templates available"
              description="ClawTeam may not be running or has no templates configured."
            />
          ) : (
            <div className="grid gap-space-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((tpl) => (
                <Card key={tpl.name}>
                  <CardHeader>
                    <CardTitle className="text-base">{tpl.name}</CardTitle>
                    <CardDescription>{tpl.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-secondary">
                        <span className="font-mono tabular-nums">{tpl.agent_count}</span> agents
                      </span>
                      <div className="flex flex-wrap gap-space-1">
                        {tpl.roles.map((role) => (
                          <Badge key={role} variant="neutral" className="text-xs">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
}
