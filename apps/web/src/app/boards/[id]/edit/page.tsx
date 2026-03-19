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
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/status/empty-state";
import { useBoard, useUpdateBoard } from "@/lib/api/hooks";

export default function EditBoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: board, isLoading } = useBoard(id);
  const updateBoard = useUpdateBoard();

  const [name, setName] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const displayName = name ?? board?.name ?? "";
  const displayDescription = description ?? board?.description ?? "";

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!displayName.trim()) next.name = "Board name is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    updateBoard.mutate(
      {
        id,
        data: {
          name: displayName.trim(),
          description: displayDescription.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          router.push(`/boards/${id}` as never);
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

  if (!board) {
    return (
      <DashboardShell>
        <EmptyState
          icon={ListTodo}
          title="Board not found"
          description="This board may have been deleted or you may not have access."
          action={
            <Button asChild>
              <Link href="/boards">Back to Boards</Link>
            </Button>
          }
        />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <PageHeader
        title={`Edit ${board.name}`}
        description="Update board settings"
        breadcrumbs={[
          { label: "Boards", href: "/boards" },
          { label: board.name, href: `/boards/${id}` },
          { label: "Edit" },
        ]}
      />

      <Card className="max-w-2xl">
        <CardContent className="pt-space-4">
          <form onSubmit={handleSubmit} className="space-y-space-4">
            {/* Name */}
            <div className="space-y-space-1">
              <Label htmlFor="board-name">
                Name <span className="text-status-critical">*</span>
              </Label>
              <Input
                id="board-name"
                value={displayName}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                }}
                placeholder="e.g. Frontend Agents"
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

            {/* Description */}
            <div className="space-y-space-1">
              <Label htmlFor="board-description">Description</Label>
              <Textarea
                id="board-description"
                value={displayDescription}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What will this board coordinate?"
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-space-3 pt-space-2">
              <Button type="submit" disabled={updateBoard.isPending}>
                {updateBoard.isPending ? "Saving..." : "Save Changes"}
              </Button>
              <Button variant="ghost" asChild>
                <Link href={`/boards/${id}` as never}>Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
