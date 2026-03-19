"use client";

import { useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Radio, Trash2, Wifi, RefreshCw } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGateway,
  useDeleteGateway,
  useTestGatewayConnection,
  useSyncGateway,
} from "@/lib/api/hooks";
import { cn } from "@/lib/utils";

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export default function GatewayDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: gateway, isLoading } = useGateway(id);
  const deleteGateway = useDeleteGateway();
  const testConnection = useTestGatewayConnection();
  const syncGateway = useSyncGateway();

  const handleDelete = useCallback(() => {
    deleteGateway.mutate(id, {
      onSuccess: () => router.push("/gateways"),
    });
  }, [id, deleteGateway, router]);

  if (isLoading) {
    return (
      <DashboardShell>
        <PageHeader
          title=""
          breadcrumbs={[
            { label: "Gateways", href: "/gateways" },
            { label: "Loading..." },
          ]}
        />
        <div className="space-y-space-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </DashboardShell>
    );
  }

  if (!gateway) {
    return (
      <DashboardShell>
        <PageHeader
          title="Gateway Not Found"
          breadcrumbs={[
            { label: "Gateways", href: "/gateways" },
            { label: "Not Found" },
          ]}
        />
        <p className="text-sm text-text-secondary">
          This gateway does not exist or has been removed.
        </p>
      </DashboardShell>
    );
  }

  const connected = gateway.status === "connected";

  return (
    <DashboardShell>
      <PageHeader
        title={gateway.name}
        description={gateway.url}
        breadcrumbs={[
          { label: "Gateways", href: "/gateways" },
          { label: gateway.name },
        ]}
        action={
          <div className="flex items-center gap-space-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/gateways/${id}/edit`}>
                <Pencil size={14} aria-hidden="true" />
                Edit
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => testConnection.mutate(id)}
              disabled={testConnection.isPending}
            >
              <Wifi size={14} aria-hidden="true" />
              {testConnection.isPending ? "Testing..." : "Test Connection"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncGateway.mutate(id)}
              disabled={syncGateway.isPending}
            >
              <RefreshCw size={14} aria-hidden="true" />
              {syncGateway.isPending ? "Syncing..." : "Sync Agents"}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleteGateway.isPending}
            >
              <Trash2 size={14} aria-hidden="true" />
              Delete
            </Button>
          </div>
        }
      />

      <div className="grid gap-space-4 md:grid-cols-2">
        {/* Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle>Connection Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-space-3">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-md",
                  connected ? "bg-status-healthy/10" : "bg-status-critical/10"
                )}
              >
                <Radio
                  size={20}
                  className={cn(
                    connected ? "text-status-healthy" : "text-status-critical"
                  )}
                  aria-hidden="true"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary capitalize">
                  {gateway.status}
                </p>
                <p className="text-xs text-text-muted">
                  Last connected: {timeAgo(gateway.last_connected_at)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-space-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-text-secondary">URL</dt>
                <dd className="font-mono text-xs text-text-primary">
                  {gateway.url}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-secondary">Agents</dt>
                <dd className="font-mono tabular-nums text-text-primary">
                  {gateway.agent_count}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-secondary">Insecure TLS</dt>
                <dd className="text-text-primary">
                  {gateway.allow_insecure_tls ? "Yes" : "No"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-secondary">Created</dt>
                <dd className="font-mono text-xs tabular-nums text-text-muted">
                  {new Date(gateway.created_at).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
