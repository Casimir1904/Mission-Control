"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Users, Crown } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/status/empty-state";
import {
  useTeamTemplates,
  useCreateTeam,
  useGateways,
  useOrganizations,
  useAvailableModels,
} from "@/lib/api/hooks";
import type { AgentModelOverride } from "@/lib/api/types";

export default function NewTeamPage() {
  return (
    <Suspense>
      <NewTeamPageInner />
    </Suspense>
  );
}

function NewTeamPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselected = searchParams.get("template") ?? "";

  const { data: templates, isLoading: templatesLoading } = useTeamTemplates();
  const { data: models } = useAvailableModels();
  const { data: gatewaysData } = useGateways();
  const { data: orgsData } = useOrganizations();
  const createTeam = useCreateTeam();

  const org = orgsData?.[0];

  const [selectedTemplate, setSelectedTemplate] = useState(preselected);
  const [boardName, setBoardName] = useState("");
  const [gatewayId, setGatewayId] = useState("");
  const [modelOverrides, setModelOverrides] = useState<Record<string, string>>({});

  const gateways = gatewaysData?.items ?? [];
  const template = templates?.find((t) => t.name === selectedTemplate);

  function handleModelChange(roleName: string, model: string) {
    setModelOverrides((prev) => ({ ...prev, [roleName]: model }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTemplate || !boardName.trim() || !org) return;

    const overrides: AgentModelOverride[] = Object.entries(modelOverrides)
      .filter(([, model]) => model)
      .map(([role_name, model]) => ({ role_name, model }));

    createTeam.mutate(
      {
        template_name: selectedTemplate,
        board_name: boardName.trim(),
        organization_id: org.id,
        gateway_id: gatewayId || undefined,
        model_overrides: overrides.length > 0 ? overrides : undefined,
      },
      {
        onSuccess: (result) => router.push(`/boards/${result.board_id}` as never),
      }
    );
  }

  return (
    <DashboardShell>
      <PageHeader
        title="Create Team"
        description="Pick a template, configure models per agent, and launch a new board."
        breadcrumbs={[
          { label: "Teams", href: "/teams" },
          { label: "Create" },
        ]}
      />

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-space-6">
        {/* Template selection */}
        <div>
          <label className="mb-space-2 block text-sm font-medium text-text-primary">
            Template
          </label>
          {templatesLoading ? (
            <Skeleton className="h-28 w-full" />
          ) : !templates || templates.length === 0 ? (
            <EmptyState icon={Users} title="No templates" description="No templates available." />
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
                  onClick={() => {
                    setSelectedTemplate(tpl.name);
                    if (!boardName) setBoardName(tpl.name);
                  }}
                >
                  <CardHeader className="pb-space-2">
                    <CardTitle className="text-sm">{tpl.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-text-secondary">{tpl.description}</p>
                    <p className="mt-space-1 text-xs text-text-muted">
                      {tpl.agents.length} agents
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Per-agent model configuration */}
        {template && (
          <div>
            <label className="mb-space-2 block text-sm font-medium text-text-primary">
              Agent Models
            </label>
            <div className="space-y-space-2">
              {template.agents.map((agent) => (
                <div
                  key={agent.name}
                  className="flex items-center gap-space-3 rounded-md border border-border-subtle bg-bg-surface px-space-3 py-space-2"
                >
                  <div className="flex items-center gap-space-1 min-w-[140px]">
                    {agent.is_leader && (
                      <Crown size={12} className="text-accent-primary shrink-0" aria-hidden="true" />
                    )}
                    <span className="text-sm font-medium">{agent.name}</span>
                  </div>
                  <Badge variant="neutral" className="text-xs shrink-0">
                    {agent.role}
                  </Badge>
                  <select
                    value={modelOverrides[agent.name] ?? agent.default_model}
                    onChange={(e) => handleModelChange(agent.name, e.target.value)}
                    className="ml-auto w-72 rounded-md border border-border-subtle bg-bg-base px-space-2 py-1 text-xs font-mono text-text-primary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                  >
                    {(models ?? []).map((m) => (
                      <option key={m.key} value={m.key}>
                        {m.name} ({m.tier})
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Board name */}
        <div>
          <label htmlFor="board-name" className="mb-space-2 block text-sm font-medium text-text-primary">
            Board Name
          </label>
          <input
            id="board-name"
            type="text"
            value={boardName}
            onChange={(e) => setBoardName(e.target.value)}
            placeholder="e.g., Code Review Sprint 12"
            className="w-full rounded-md border border-border-subtle bg-bg-surface px-space-3 py-space-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
          />
        </div>

        {/* Gateway selection */}
        {gateways.length > 0 && (
          <div>
            <label htmlFor="gateway" className="mb-space-2 block text-sm font-medium text-text-primary">
              Gateway (optional)
            </label>
            <select
              id="gateway"
              value={gatewayId}
              onChange={(e) => setGatewayId(e.target.value)}
              className="w-full rounded-md border border-border-subtle bg-bg-surface px-space-3 py-space-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
            >
              <option value="">No gateway</option>
              {gateways.map((gw) => (
                <option key={gw.id} value={gw.id}>
                  {gw.name} ({gw.status})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center gap-space-3">
          <Button
            type="submit"
            disabled={!selectedTemplate || !boardName.trim() || !org || createTeam.isPending}
          >
            {createTeam.isPending ? "Creating..." : "Create Team"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </DashboardShell>
  );
}
