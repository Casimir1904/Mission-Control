"use client";

import dynamic from "next/dynamic";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/status/empty-state";
import { Network } from "lucide-react";
import { useTopologyData } from "@/hooks/use-topology-data";

// Dynamic import: Sigma.js uses WebGL and cannot render on the server
const TopologyGraph = dynamic(
  () =>
    import("@/components/topology/topology-graph").then(
      (mod) => mod.TopologyGraph
    ),
  {
    ssr: false,
    loading: () => <TopologyGraphSkeleton />,
  }
);

function TopologyGraphSkeleton() {
  return (
    <div className="flex flex-1 items-center justify-center rounded-md border border-border-subtle bg-bg-base">
      <div className="flex flex-col items-center gap-space-3">
        <div className="h-12 w-12 animate-skeleton-pulse rounded-md bg-bg-elevated" />
        <div className="h-4 w-40 animate-skeleton-pulse rounded bg-bg-elevated" />
        <div className="h-3 w-56 animate-skeleton-pulse rounded bg-bg-elevated" />
      </div>
    </div>
  );
}

export default function TopologyPage() {
  const { nodes, edges, isEmpty, isLoading, isError } = useTopologyData();

  return (
    <DashboardShell>
      {/* PageHeader with minimal bottom padding so the graph fills the space */}
      <PageHeader
        title="Topology"
        description="Visual graph of agents, boards, and gateway connections"
      />

      {/* Error state */}
      {isError && (
        <div className="mb-space-3 rounded-md border border-status-critical/30 bg-status-critical/10 p-space-4 text-sm text-status-critical">
          Failed to load topology data. The API server may not be running.
        </div>
      )}

      {/* Graph container: fills all remaining vertical space */}
      <div className="flex flex-1" style={{ minHeight: "calc(100vh - 200px)" }}>
        {isLoading ? (
          <TopologyGraphSkeleton />
        ) : isEmpty ? (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState
              icon={Network}
              title="No topology data"
              description="Connect a gateway to see your agent network. The topology graph visualizes how agents, boards, and gateways are wired together."
            />
          </div>
        ) : (
          <TopologyGraph data={{ nodes, edges, isEmpty }} />
        )}
      </div>
    </DashboardShell>
  );
}
