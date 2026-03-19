"use client";

import { useRouter } from "next/navigation";
import { Users, Crown } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/status/empty-state";
import { useTeamTemplates } from "@/lib/api/hooks";

export default function TeamsPage() {
  const router = useRouter();
  const { data: templates, isLoading } = useTeamTemplates();

  return (
    <DashboardShell>
      <PageHeader
        title="Team Templates"
        description="Create a board with a pre-configured team of agents. Choose models per role."
      />

      {isLoading ? (
        <div className="grid gap-space-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-52 w-full" />
          ))}
        </div>
      ) : !templates || templates.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No templates available"
          description="Team templates are not configured."
        />
      ) : (
        <div className="grid gap-space-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((tpl) => (
            <Card key={tpl.name} className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-base">{tpl.name}</CardTitle>
                <CardDescription>{tpl.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between gap-space-3">
                <div className="space-y-space-2">
                  {tpl.agents.map((agent) => (
                    <div key={agent.name} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-space-1">
                        {agent.is_leader && (
                          <Crown size={12} className="text-accent-primary" aria-hidden="true" />
                        )}
                        <span className={agent.is_leader ? "font-medium" : "text-text-secondary"}>
                          {agent.name}
                        </span>
                      </span>
                      <Badge variant="neutral" className="text-xs font-mono">
                        {agent.default_model.split("/").pop()}
                      </Badge>
                    </div>
                  ))}
                </div>
                <Button
                  className="mt-space-2 w-full"
                  onClick={() => router.push(`/teams/new?template=${tpl.name}` as never)}
                >
                  Create Team
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
