"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreateAgent, useBoards } from "@/lib/api/hooks";

export default function NewAgentPage() {
  return (
    <Suspense
      fallback={
        <DashboardShell>
          <div className="space-y-space-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-96 max-w-2xl" />
          </div>
        </DashboardShell>
      }
    >
      <NewAgentForm />
    </Suspense>
  );
}

function NewAgentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultBoardId = searchParams.get("board_id") ?? "";

  const createAgent = useCreateAgent();
  const { data: boardsData, isLoading: boardsLoading } = useBoards();

  const boards = boardsData?.items ?? [];

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [backstory, setBackstory] = useState("");
  const [goal, setGoal] = useState("");
  const [boardId, setBoardId] = useState(defaultBoardId);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Agent name is required";
    if (!role.trim()) next.role = "Role is required";
    if (!boardId) next.board_id = "Board selection is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    createAgent.mutate(
      {
        name: name.trim(),
        role: role.trim(),
        backstory: backstory.trim() || undefined,
        goal: goal.trim() || undefined,
        board_id: boardId,
      },
      {
        onSuccess: (agent) => {
          router.push(`/agents/${agent.id}` as never);
        },
      }
    );
  }

  return (
    <DashboardShell>
      <PageHeader
        title="New Agent"
        description="Register a new AI agent"
        breadcrumbs={[
          { label: "Agents", href: "/agents" },
          { label: "New Agent" },
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
                value={name}
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
                value={role}
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

            {/* Board */}
            <div className="space-y-space-1">
              <Label>
                Board <span className="text-status-critical">*</span>
              </Label>
              {boardsLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Select value={boardId} onValueChange={(val) => {
                  setBoardId(val);
                  if (errors.board_id) setErrors((prev) => ({ ...prev, board_id: "" }));
                }}>
                  <SelectTrigger aria-invalid={!!errors.board_id}>
                    <SelectValue placeholder="Select a board" />
                  </SelectTrigger>
                  <SelectContent>
                    {boards.map((board) => (
                      <SelectItem key={board.id} value={board.id}>
                        {board.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.board_id && (
                <p className="text-xs text-status-critical" role="alert">
                  {errors.board_id}
                </p>
              )}
            </div>

            {/* Backstory */}
            <div className="space-y-space-1">
              <Label htmlFor="agent-backstory">Backstory</Label>
              <Textarea
                id="agent-backstory"
                value={backstory}
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
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Primary objective for this agent..."
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-space-3 pt-space-2">
              <Button
                type="submit"
                disabled={createAgent.isPending}
              >
                {createAgent.isPending ? "Creating..." : "Create Agent"}
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/agents">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
