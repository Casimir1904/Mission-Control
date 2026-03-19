"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Play } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/status/empty-state";
import { useTeamTemplates, useCreateTeamRun } from "@/lib/api/hooks";

export default function NewTeamRunPage() {
  const router = useRouter();
  const { data: templates, isLoading } = useTeamTemplates();
  const createRun = useCreateTeamRun();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [task, setTask] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTemplate || !task.trim()) return;

    createRun.mutate(
      { team_name: selectedTemplate, task: task.trim() },
      {
        onSuccess: (run) => router.push(`/teams/runs/${run.id}` as never),
      }
    );
  }

  return (
    <DashboardShell>
      <PageHeader
        title="Start Team Run"
        description="Select a team template and describe the task."
        breadcrumbs={[
          { label: "Teams", href: "/teams" },
          { label: "New Run" },
        ]}
      />

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-space-6">
        <div>
          <label className="mb-space-2 block text-sm font-medium text-text-primary">
            Team Template
          </label>
          {isLoading ? (
            <div className="grid gap-space-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full" />
              ))}
            </div>
          ) : !templates || templates.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No templates"
              description="ClawTeam has no templates available."
            />
          ) : (
            <div className="grid gap-space-3 sm:grid-cols-2">
              {templates.map((tpl) => (
                <Card
                  key={tpl.name}
                  className={`cursor-pointer transition-colors ${
                    selectedTemplate === tpl.name
                      ? "border-accent-primary ring-1 ring-accent-primary"
                      : "hover:border-border-default"
                  }`}
                  onClick={() => setSelectedTemplate(tpl.name)}
                >
                  <CardHeader className="pb-space-2">
                    <CardTitle className="text-sm">{tpl.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {tpl.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-space-1">
                      {tpl.roles.map((role) => (
                        <Badge key={role} variant="neutral" className="text-xs">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <label
            htmlFor="task-input"
            className="mb-space-2 block text-sm font-medium text-text-primary"
          >
            Task Description
          </label>
          <textarea
            id="task-input"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="Describe what the team should accomplish..."
            className="w-full rounded-md border border-border-subtle bg-bg-surface px-space-3 py-space-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
            rows={4}
          />
        </div>

        <div className="flex items-center gap-space-3">
          <Button
            type="submit"
            disabled={!selectedTemplate || !task.trim() || createRun.isPending}
          >
            <Play size={14} aria-hidden="true" />
            {createRun.isPending ? "Starting..." : "Start Run"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </form>
    </DashboardShell>
  );
}
