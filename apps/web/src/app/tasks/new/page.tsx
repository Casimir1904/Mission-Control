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
import { useCreateTask, useBoards, useAgentsByBoard } from "@/lib/api/hooks";
import type { TaskPriority, TaskStatus } from "@/lib/api/types";

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

export default function NewTaskPage() {
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
      <NewTaskForm />
    </Suspense>
  );
}

function NewTaskForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultBoardId = searchParams.get("board_id") ?? "";
  const defaultStatus = (searchParams.get("status") as TaskStatus) ?? undefined;

  const createTask = useCreateTask();
  const { data: boardsData, isLoading: boardsLoading } = useBoards();
  const boards = boardsData?.items ?? [];

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [boardId, setBoardId] = useState(defaultBoardId);
  const [agentId, setAgentId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load agents for selected board
  const { data: agentsData, isLoading: agentsLoading } =
    useAgentsByBoard(boardId);
  const agents = agentsData?.items ?? [];

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = "Task title is required";
    if (!boardId) next.board_id = "Board selection is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    createTask.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        board_id: boardId,
        assigned_agent_id: agentId || undefined,
        status: defaultStatus,
      },
      {
        onSuccess: () => {
          if (defaultBoardId) {
            router.push(`/boards/${defaultBoardId}` as never);
          } else {
            router.push("/tasks");
          }
        },
      }
    );
  }

  return (
    <DashboardShell>
      <PageHeader
        title="New Task"
        description="Create a new task"
        breadcrumbs={[
          { label: "Tasks", href: "/tasks" },
          { label: "New Task" },
        ]}
      />

      <Card className="max-w-2xl">
        <CardContent className="pt-space-4">
          <form onSubmit={handleSubmit} className="space-y-space-4">
            {/* Title */}
            <div className="space-y-space-1">
              <Label htmlFor="task-title">
                Title <span className="text-status-critical">*</span>
              </Label>
              <Input
                id="task-title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errors.title)
                    setErrors((prev) => ({ ...prev, title: "" }));
                }}
                placeholder="e.g. Implement user authentication"
                aria-invalid={!!errors.title}
                aria-describedby={errors.title ? "title-error" : undefined}
                autoFocus
              />
              {errors.title && (
                <p
                  id="title-error"
                  className="text-xs text-status-critical"
                  role="alert"
                >
                  {errors.title}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-space-1">
              <Label htmlFor="task-description">Description</Label>
              <Textarea
                id="task-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what needs to be done..."
                rows={4}
              />
            </div>

            {/* Priority */}
            <div className="space-y-space-1">
              <Label>Priority</Label>
              <Select
                value={priority}
                onValueChange={(val) => setPriority(val as TaskPriority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Board */}
            <div className="space-y-space-1">
              <Label>
                Board <span className="text-status-critical">*</span>
              </Label>
              {boardsLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Select
                  value={boardId}
                  onValueChange={(val) => {
                    setBoardId(val);
                    setAgentId(""); // reset agent when board changes
                    if (errors.board_id)
                      setErrors((prev) => ({ ...prev, board_id: "" }));
                  }}
                >
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

            {/* Assigned Agent (filtered by board) */}
            <div className="space-y-space-1">
              <Label>Assigned Agent</Label>
              {boardId ? (
                agentsLoading ? (
                  <Skeleton className="h-9 w-full" />
                ) : (
                  <Select value={agentId} onValueChange={setAgentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name} ({agent.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              ) : (
                <p className="text-xs text-text-muted">
                  Select a board first to see available agents.
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-space-3 pt-space-2">
              <Button type="submit" disabled={createTask.isPending}>
                {createTask.isPending ? "Creating..." : "Create Task"}
              </Button>
              <Button variant="ghost" asChild>
                <Link href={(defaultBoardId ? `/boards/${defaultBoardId}` : "/tasks") as never}>
                  Cancel
                </Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
