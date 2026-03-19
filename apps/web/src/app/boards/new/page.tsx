"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useCreateBoard } from "@/lib/api/hooks";

export default function NewBoardPage() {
  const router = useRouter();
  const createBoard = useCreateBoard();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!name.trim()) {
      next.name = "Board name is required";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    createBoard.mutate(
      { name: name.trim(), description: description.trim() || undefined },
      {
        onSuccess: (board) => {
          router.push(`/boards/${board.id}` as never);
        },
      }
    );
  }

  return (
    <DashboardShell>
      <PageHeader
        title="New Board"
        description="Create a new mission board"
        breadcrumbs={[
          { label: "Boards", href: "/boards" },
          { label: "New Board" },
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
                value={name}
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
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What will this board coordinate?"
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-space-3 pt-space-2">
              <Button
                type="submit"
                disabled={createBoard.isPending}
              >
                {createBoard.isPending ? "Creating..." : "Create Board"}
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/boards">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
