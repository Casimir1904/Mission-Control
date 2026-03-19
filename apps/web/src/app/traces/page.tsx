"use client";

import { Activity } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/status/empty-state";
import { TraceList } from "@/components/traces/trace-list";
import { useTraces } from "@/lib/api/hooks";

export default function TracesPage() {
  const { data, isLoading } = useTraces();
  const traces = data?.items ?? [];
  const isEmpty = !isLoading && traces.length === 0;

  return (
    <DashboardShell>
      <PageHeader
        title="Traces"
        description="LLM call traces and agent execution history"
      />

      {isEmpty ? (
        <EmptyState
          icon={Activity}
          title="No traces recorded"
          description="Traces capture the full execution path of agent actions, including LLM calls and tool usage. Run some agents to see traces."
        />
      ) : (
        <TraceList traces={traces} isLoading={isLoading} />
      )}
    </DashboardShell>
  );
}
