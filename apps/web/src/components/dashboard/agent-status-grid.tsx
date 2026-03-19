"use client";

import { useMemo, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { StatusDot } from "@/components/status/status-dot";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/status/empty-state";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Agent, AgentStatus } from "@/lib/api/types";

interface AgentStatusGridProps {
  agents: Agent[];
  isLoading: boolean;
  /** IDs of agents that just received an update, for flash highlighting */
  highlightedIds?: Set<string>;
}

const STATUS_VARIANT_MAP: Record<AgentStatus, "healthy" | "warning" | "critical" | "info" | "neutral"> = {
  online: "healthy",
  degraded: "warning",
  offline: "critical",
  provisioning: "info",
};

/**
 * Format a heartbeat timestamp into a human-readable "time ago" string.
 */
function formatTimeAgo(isoString?: string): string {
  if (!isoString) return "--";

  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return "just now";

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Dense agent status grid per DESIGN.md specs:
 * Compact rows (48px), sorted offline-first, with status dots and monospace timestamps.
 */
export function AgentStatusGrid({
  agents,
  isLoading,
  highlightedIds,
}: AgentStatusGridProps) {
  // Sort: offline first (needs attention), degraded, provisioning, online, then by name
  const sortedAgents = useMemo(() => {
    const statusOrder: Record<AgentStatus, number> = {
      offline: 0,
      degraded: 1,
      provisioning: 2,
      online: 3,
    };

    return [...agents].sort((a, b) => {
      const statusDiff = (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4);
      if (statusDiff !== 0) return statusDiff;
      return a.name.localeCompare(b.name);
    });
  }, [agents]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Agent Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-0">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex h-12 items-center gap-space-3 border-b border-border-subtle px-space-3 last:border-b-0"
              >
                <Skeleton className="h-2 w-2 rounded-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32 flex-1" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (agents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Agent Status</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Bot}
            title="No agents yet"
            description="Add agents to your boards and their status will appear here in real time."
            className="py-8"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="p-0">
      <CardHeader className="px-space-4 pt-space-4">
        <CardTitle>Agent Status</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div role="table" aria-label="Agent status grid">
          {/* Header row */}
          <div
            className="flex h-8 items-center border-b border-border-default px-space-4 text-xs font-medium text-text-muted"
            role="row"
          >
            <span className="w-6" role="columnheader" aria-label="Status" />
            <span className="w-36 shrink-0" role="columnheader">Agent</span>
            <span className="min-w-0 flex-1" role="columnheader">Current Task</span>
            <span className="w-20 shrink-0 text-right" role="columnheader">Heartbeat</span>
          </div>

          {/* Agent rows */}
          {sortedAgents.map((agent) => (
            <AgentRow
              key={agent.id}
              agent={agent}
              isHighlighted={highlightedIds?.has(agent.id) ?? false}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AgentRow({
  agent,
  isHighlighted,
}: {
  agent: Agent;
  isHighlighted: boolean;
}) {
  const [flash, setFlash] = useState(false);
  const prevHighlighted = useRef(isHighlighted);

  useEffect(() => {
    if (isHighlighted && !prevHighlighted.current) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 1000);
      return () => clearTimeout(timer);
    }
    prevHighlighted.current = isHighlighted;
  }, [isHighlighted]);

  const variant = STATUS_VARIANT_MAP[agent.status] ?? "neutral";

  return (
    <Link
      href={`/agents/${agent.id}`}
      className={cn(
        "flex h-12 items-center border-b border-border-subtle px-space-4 transition-colors",
        "hover:bg-bg-elevated focus-visible:bg-bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-strong",
        "last:border-b-0",
        flash && "bg-bg-elevated"
      )}
      role="row"
    >
      <span className="w-6 shrink-0" role="cell">
        <StatusDot variant={variant} label={`${agent.name}: ${agent.status}`} />
      </span>
      <span
        className="w-36 shrink-0 truncate text-sm font-medium text-text-primary"
        role="cell"
        title={agent.name}
      >
        {agent.name}
      </span>
      <span
        className="min-w-0 flex-1 truncate text-sm text-text-secondary"
        role="cell"
        title={agent.current_task ?? "Idle"}
      >
        {agent.current_task ?? (
          <span className="text-text-muted">Idle</span>
        )}
      </span>
      <span
        className="w-20 shrink-0 text-right font-mono text-xs tabular-nums text-text-muted"
        role="cell"
      >
        {formatTimeAgo(agent.last_heartbeat)}
      </span>
    </Link>
  );
}
