"use client";

import { useState } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import {
  HealthOverview,
  AgentStatusGrid,
  MetricsBar,
  ActivityStream,
  LiveIndicator,
} from "@/components/dashboard";
import { useDashboard, useAgents } from "@/lib/api/hooks";
import { useRealtimeDashboard } from "@/hooks/use-realtime";

export default function DashboardPage() {
  const { data: dashboardData, isLoading: dashboardLoading } = useDashboard();
  const { data: agentsData, isLoading: agentsLoading } = useAgents();
  const { isConnected } = useRealtimeDashboard();

  // Track recently updated agent IDs for flash highlighting
  const [highlightedIds] = useState<Set<string>>(new Set());

  const agents = agentsData?.items ?? [];
  const recentActivity = dashboardData?.recent_activity ?? [];

  return (
    <DashboardShell>
      <div className="flex items-start justify-between">
        <PageHeader
          title="Dashboard"
          description="System-wide operational overview"
        />
        <LiveIndicator isConnected={isConnected} className="mt-2" />
      </div>

      {/* Health Banner */}
      <HealthOverview data={dashboardData} isLoading={dashboardLoading} />

      {/* Main grid: Agent status + Activity stream */}
      <div className="mt-space-4 grid gap-space-4 lg:grid-cols-3">
        {/* Left 2/3: Agent grid + Metrics */}
        <div className="space-y-space-4 lg:col-span-2">
          <AgentStatusGrid
            agents={agents}
            isLoading={agentsLoading}
            highlightedIds={highlightedIds}
          />

          <MetricsBar data={dashboardData} isLoading={dashboardLoading} />
        </div>

        {/* Right 1/3: Activity stream */}
        <div className="lg:col-span-1">
          <ActivityStream
            events={recentActivity}
            isLoading={dashboardLoading}
          />
        </div>
      </div>
    </DashboardShell>
  );
}
