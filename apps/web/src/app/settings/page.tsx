"use client";

import { useState, type FormEvent, useEffect } from "react";
import { Settings, Users, UserPlus } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  useCurrentOrganization,
  useUpdateOrganization,
  useOrganizationMembers,
} from "@/lib/api/hooks";

export default function SettingsPage() {
  const { data: org, isLoading: orgLoading } = useCurrentOrganization();
  const updateOrg = useUpdateOrganization();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  // Populate form when org loads
  useEffect(() => {
    if (org) {
      setName(org.name);
      setDescription(org.description ?? "");
    }
  }, [org]);

  // Track changes
  useEffect(() => {
    if (org) {
      setHasChanges(
        name !== org.name || description !== (org.description ?? "")
      );
    }
  }, [name, description, org]);

  function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!org || !hasChanges) return;

    updateOrg.mutate({
      id: org.id,
      data: {
        name: name.trim(),
        description: description.trim() || undefined,
      },
    });
  }

  return (
    <DashboardShell>
      <PageHeader
        title="Settings"
        description="Configure your Mission Control organization"
      />

      <div className="max-w-3xl space-y-space-6">
        {/* Organization Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-space-2">
              <Settings size={16} aria-hidden="true" />
              Organization
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orgLoading ? (
              <div className="space-y-space-4">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-space-4">
                <div className="space-y-space-1">
                  <Label htmlFor="org-name">Organization Name</Label>
                  <Input
                    id="org-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-space-1">
                  <Label htmlFor="org-description">Description</Label>
                  <Textarea
                    id="org-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={!hasChanges || updateOrg.isPending}
                >
                  {updateOrg.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Members */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-space-2">
                <Users size={16} aria-hidden="true" />
                Members
              </CardTitle>
              <Button size="sm" variant="outline" disabled>
                <UserPlus size={14} aria-hidden="true" />
                Invite Member
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {org ? (
              <MembersTable orgId={org.id} />
            ) : orgLoading ? (
              <div className="space-y-space-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted">
                Unable to load organization data.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}

function MembersTable({ orgId }: { orgId: string }) {
  const { data, isLoading } = useOrganizationMembers(orgId);
  const members = data?.items ?? [];

  if (isLoading) {
    return (
      <div className="space-y-space-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <p className="py-space-4 text-center text-sm text-text-muted">
        No members found.
      </p>
    );
  }

  return (
    <div className="rounded-md border border-border-subtle">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id}>
              <TableCell className="font-medium">{member.name}</TableCell>
              <TableCell className="text-text-secondary">
                {member.email}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    member.role === "owner"
                      ? "info"
                      : member.role === "admin"
                        ? "warning"
                        : "default"
                  }
                >
                  {member.role}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-xs text-text-muted tabular-nums">
                {new Date(member.joined_at).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
