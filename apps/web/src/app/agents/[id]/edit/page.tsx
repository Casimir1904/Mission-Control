"use client";

import { use, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bot } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/status/empty-state";
import { useAgent, useUpdateAgent } from "@/lib/api/hooks";

export default function EditAgentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: agent, isLoading } = useAgent(id);
  const updateAgent = useUpdateAgent();

  const [name, setName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [backstory, setBackstory] = useState<string | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Derive displayed values: local override or server data
  const displayName = name ?? agent?.name ?? "";
  const displayRole = role ?? agent?.role ?? "";
  const displayBackstory = backstory ?? agent?.backstory ?? "";
  const displayGoal = goal ?? agent?.goal ?? "";

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!displayName.trim()) next.name = "Agent name is required";
    if (!displayRole.trim()) next.role = "Role is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    updateAgent.mutate(
      {
        id,
        data: {
          name: displayName.trim(),
          role: displayRole.trim(),
          backstory: displayBackstory.trim() || undefined,
          goal: displayGoal.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          router.push(`/agents/${id}` as never);
        },
      }
    );
  }

  if (isLoading) {
    return (
      <DashboardShell>
        <div className="space-y-space-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-96 max-w-2xl" />
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
        title={`Edit ${agent.name}`}
        description="Update agent configuration"
        breadcrumbs={[
          { label: "Agents", href: "/agents" },
          { label: agent.name, href: `/agents/${id}` },
          { label: "Edit" },
        ]}
      />

      <Card className="max-w-2xl">
        <CardContent className="pt-space-4">
          <form onSubmit={handleSubmit} className="space-y-space-4">
            {/* Name */}
            <div className="space-y-space-1">
              <Label htmlFor="agent-name">
                Name <span className="text-status-critical">*</span>
              </Label>
              <Input
                id="agent-name"
                value={displayName}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                }}
                placeholder="e.g. Code Reviewer"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "name-error" : undefined}
                autoFocus
              />
              {errors.name && (
                <p id="name-error" className="text-xs text-status-critical" role="alert">
                  {errors.name}
                </p>
              )}
            </div>

            {/* Role */}
            <div className="space-y-space-1">
              <Label htmlFor="agent-role">
                Role <span className="text-status-critical">*</span>
              </Label>
              <Input
                id="agent-role"
                value={displayRole}
                onChange={(e) => {
                  setRole(e.target.value);
                  if (errors.role) setErrors((prev) => ({ ...prev, role: "" }));
                }}
                placeholder="e.g. Senior Code Reviewer"
              />
              {errors.role && (
                <p className="text-xs text-status-critical" role="alert">
                  {errors.role}
                </p>
              )}
            </div>

            {/* Backstory */}
            <div className="space-y-space-1">
              <Label htmlFor="agent-backstory">Backstory</Label>
              <Textarea
                id="agent-backstory"
                value={displayBackstory}
                onChange={(e) => setBackstory(e.target.value)}
                placeholder="Background and expertise of this agent..."
                rows={3}
              />
            </div>

            {/* Goal */}
            <div className="space-y-space-1">
              <Label htmlFor="agent-goal">Goal</Label>
              <Textarea
                id="agent-goal"
                value={displayGoal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Primary objective for this agent..."
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-space-3 pt-space-2">
              <Button type="submit" disabled={updateAgent.isPending}>
                {updateAgent.isPending ? "Saving..." : "Save Changes"}
              </Button>
              <Button variant="ghost" asChild>
                <Link href={`/agents/${id}` as never}>Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
