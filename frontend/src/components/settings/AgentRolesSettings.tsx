"use client";

import { useState } from "react";
import { Edit2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  useListAgentRoles,
  useCreateAgentRole,
  useUpdateAgentRole,
  useDeleteAgentRole,
  type AgentRoleRead,
  type AgentRoleCreate,
} from "@/lib/api-hooks";

export function AgentRolesSettings() {
  const [editingRole, setEditingRole] = useState<AgentRoleRead | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AgentRoleRead | null>(null);

  const rolesQuery = useListAgentRoles({ refetchOnMount: "always" });
  const createMutation = useCreateAgentRole();
  const updateMutation = useUpdateAgentRole();
  const deleteMutation = useDeleteAgentRole({
    onSuccess: () => setDeleteTarget(null),
  });

  const roles =
    rolesQuery.data?.status === 200 ? (rolesQuery.data.data.items ?? []) : [];

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Agent Roles</h2>
            <p className="mt-1 text-sm text-slate-500">
              Define roles with default models and templates for quick agent creation.
            </p>
          </div>
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4" />
            New role
          </Button>
        </div>

        <div className="mt-6">
          {rolesQuery.isLoading ? (
            <p className="text-sm text-slate-500">Loading roles...</p>
          ) : roles.length === 0 ? (
            <p className="text-sm text-slate-500">
              No roles yet. Roles will be seeded automatically when you first load this page with a connected gateway.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {role.avatar_emoji || "🤖"}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {role.name}
                        {role.is_preset ? (
                          <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-blue-700">
                            Preset
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-slate-500">
                        {role.description || "No description"}
                      </p>
                      {role.default_model ? (
                        <p className="mt-0.5 text-xs text-slate-400">
                          Model: {role.default_model}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingRole(role)}
                    >
                      <Edit2 className="h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteTarget(role)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <RoleFormDialog
        open={isCreating}
        onOpenChange={setIsCreating}
        title="Create agent role"
        onSubmit={async (data) => {
          await createMutation.mutateAsync(data);
          setIsCreating(false);
        }}
        isPending={createMutation.isPending}
      />

      {editingRole ? (
        <RoleFormDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setEditingRole(null);
          }}
          title="Edit agent role"
          initialData={editingRole}
          onSubmit={async (data) => {
            await updateMutation.mutateAsync({
              roleId: editingRole.id,
              data,
            });
            setEditingRole(null);
          }}
          isPending={updateMutation.isPending}
        />
      ) : null}

      <ConfirmActionDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        ariaLabel="Delete role"
        title="Delete role"
        description={`Remove "${deleteTarget?.name}"? This cannot be undone.`}
        errorMessage={deleteMutation.error?.message}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        isConfirming={deleteMutation.isPending}
      />
    </div>
  );
}

function RoleFormDialog({
  open,
  onOpenChange,
  title,
  initialData,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialData?: AgentRoleRead;
  onSubmit: (data: AgentRoleCreate) => Promise<void>;
  isPending: boolean;
}) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(
    initialData?.description ?? "",
  );
  const [avatarEmoji, setAvatarEmoji] = useState(
    initialData?.avatar_emoji ?? "",
  );
  const [defaultModel, setDefaultModel] = useState(
    initialData?.default_model ?? "",
  );
  const [soulTemplate, setSoulTemplate] = useState(
    initialData?.soul_template ?? "",
  );
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required.");
      return;
    }
    setError(null);
    try {
      await onSubmit({
        name: trimmed,
        description: description.trim() || null,
        avatar_emoji: avatarEmoji.trim() || null,
        default_model: defaultModel.trim() || null,
        soul_template: soulTemplate.trim() || null,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Configure role defaults for agent creation.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Developer"
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Avatar emoji
              </label>
              <Input
                value={avatarEmoji}
                onChange={(e) => setAvatarEmoji(e.target.value)}
                placeholder="e.g. 👨‍💻"
                disabled={isPending}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Description
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this role do?"
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Default model
            </label>
            <Input
              value={defaultModel}
              onChange={(e) => setDefaultModel(e.target.value)}
              placeholder="e.g. claude-sonnet-4-6"
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Soul template
            </label>
            <Textarea
              value={soulTemplate}
              onChange={(e) => setSoulTemplate(e.target.value)}
              placeholder="Agent personality and behavior instructions..."
              rows={4}
              disabled={isPending}
            />
          </div>
          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
