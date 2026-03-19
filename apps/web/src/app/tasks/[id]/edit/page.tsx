"use client";

import { use, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ListTodo } from "lucide-react";
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
import { EmptyState } from "@/components/status/empty-state";
import { useTask, useUpdateTask } from "@/lib/api/hooks";
import type { TaskPriority } from "@/lib/api/types";

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

export default function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: task, isLoading } = useTask(id);
  const updateTask = useUpdateTask();

  const [title, setTitle] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [priority, setPriority] = useState<TaskPriority | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const displayTitle = title ?? task?.title ?? "";
  const displayDescription = description ?? task?.description ?? "";
  const displayPriority = priority ?? task?.priority ?? "medium";

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!displayTitle.trim()) next.title = "Task title is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    updateTask.mutate(
      {
        id,
        data: {
          title: displayTitle.trim(),
          description: displayDescription.trim() || undefined,
          priority: displayPriority,
        },
      },
      {
        onSuccess: () => {
          router.push(`/tasks/${id}` as never);
        },
      }
    );
  }

  if (isLoading) {
    return (
      <DashboardShell>
        <div className="space-y-space-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 max-w-2xl" />
        </div>
      </DashboardShell>
    );
  }

  if (!task) {
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

  return (
    <DashboardShell>
      <PageHeader
        title={`Edit Task`}
        description={task.title}
        breadcrumbs={[
          { label: "Tasks", href: "/tasks" },
          { label: task.title, href: `/tasks/${id}` },
          { label: "Edit" },
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
                value={displayTitle}
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
                value={displayDescription}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what needs to be done..."
                rows={4}
              />
            </div>

            {/* Priority */}
            <div className="space-y-space-1">
              <Label>Priority</Label>
              <Select
                value={displayPriority}
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

            {/* Actions */}
            <div className="flex items-center gap-space-3 pt-space-2">
              <Button type="submit" disabled={updateTask.isPending}>
                {updateTask.isPending ? "Saving..." : "Save Changes"}
              </Button>
              <Button variant="ghost" asChild>
                <Link href={`/tasks/${id}` as never}>Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
