"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { TopologyNode } from "@/hooks/use-topology-data";
import type { Agent, Board, Gateway } from "@/lib/api/types";

interface NodeTooltipProps {
  node: TopologyNode;
  position: { x: number; y: number };
  onClose: () => void;
}

function StatusIndicator({
  status,
  type,
}: {
  status: string;
  type: string;
}) {
  let colorClass = "bg-status-neutral";

  if (type === "agent") {
    switch (status) {
      case "online":
        colorClass = "bg-status-healthy";
        break;
      case "offline":
        colorClass = "bg-status-critical";
        break;
      case "degraded":
        colorClass = "bg-status-warning";
        break;
    }
  } else if (type === "gateway") {
    colorClass =
      status === "connected" ? "bg-status-healthy" : "bg-status-critical";
  } else if (type === "board") {
    colorClass =
      status === "active" ? "bg-status-info" : "bg-status-neutral";
  }

  return (
    <span className="inline-flex items-center gap-space-1">
      <span
        className={`inline-block h-2 w-2 shrink-0 rounded-full ${colorClass}`}
        role="img"
        aria-label={`Status: ${status}`}
      />
      <span className="capitalize">{status}</span>
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    agent: "bg-[#10B981]/15 text-[#10B981]",
    board: "bg-[#3B82F6]/15 text-[#3B82F6]",
    gateway: "bg-[#8B5CF6]/15 text-[#8B5CF6]",
  };

  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${colors[type] ?? "bg-bg-elevated text-text-muted"}`}
    >
      {type}
    </span>
  );
}

function AgentDetails({ entity }: { entity: Agent }) {
  return (
    <>
      {entity.role && (
        <div className="flex justify-between">
          <span className="text-text-muted">Role</span>
          <span className="text-text-primary">{entity.role}</span>
        </div>
      )}
      {entity.current_task && (
        <div className="flex justify-between">
          <span className="text-text-muted">Task</span>
          <span className="max-w-[140px] truncate text-text-primary">
            {entity.current_task}
          </span>
        </div>
      )}
      {entity.board_name && (
        <div className="flex justify-between">
          <span className="text-text-muted">Board</span>
          <span className="text-text-primary">{entity.board_name}</span>
        </div>
      )}
    </>
  );
}

function BoardDetails({ entity }: { entity: Board }) {
  return (
    <>
      <div className="flex justify-between">
        <span className="text-text-muted">Agents</span>
        <span className="text-text-primary">{entity.agent_count}</span>
      </div>
      {entity.description && (
        <div className="flex justify-between">
          <span className="text-text-muted">Desc.</span>
          <span className="max-w-[140px] truncate text-text-primary">
            {entity.description}
          </span>
        </div>
      )}
    </>
  );
}

function GatewayDetails({ entity }: { entity: Gateway }) {
  return (
    <>
      <div className="flex justify-between">
        <span className="text-text-muted">Agents</span>
        <span className="text-text-primary">{entity.agent_count}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-text-muted">URL</span>
        <span className="max-w-[140px] truncate font-mono text-xs text-text-primary">
          {entity.url}
        </span>
      </div>
    </>
  );
}

export function NodeTooltip({ node, position, onClose }: NodeTooltipProps) {
  const router = useRouter();

  const handleNavigate = useCallback(() => {
    onClose();
    router.push(node.detailUrl as never);
  }, [router, node.detailUrl, onClose]);

  // Compute offset so tooltip doesn't go off-screen
  // Position it slightly below and to the right of the node
  const tooltipStyle: React.CSSProperties = {
    position: "absolute",
    left: position.x + 12,
    top: position.y + 12,
    zIndex: 50,
    pointerEvents: "auto",
  };

  return (
    <>
      {/* Invisible backdrop to capture clicks outside tooltip */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="z-50 w-64 rounded-md border border-border-subtle bg-bg-elevated shadow-lg shadow-black/40"
        style={tooltipStyle}
        role="tooltip"
        aria-label={`Details for ${node.label}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle px-space-3 py-space-2">
          <span className="truncate text-sm font-semibold text-text-primary">
            {node.label}
          </span>
          <TypeBadge type={node.type} />
        </div>

        {/* Details */}
        <div className="space-y-1.5 px-space-3 py-space-2 text-xs">
          {node.status && (
            <div className="flex justify-between">
              <span className="text-text-muted">Status</span>
              <StatusIndicator status={String(node.status)} type={node.type} />
            </div>
          )}

          {node.type === "agent" && (
            <AgentDetails entity={node.entity as Agent} />
          )}
          {node.type === "board" && (
            <BoardDetails entity={node.entity as Board} />
          )}
          {node.type === "gateway" && (
            <GatewayDetails entity={node.entity as Gateway} />
          )}
        </div>

        {/* Footer with navigation */}
        <div className="border-t border-border-subtle px-space-3 py-space-2">
          <button
            onClick={handleNavigate}
            className="w-full rounded-md px-space-2 py-space-1 text-xs font-medium text-accent-primary transition-colors hover:bg-accent-primary/10"
          >
            View Details &rarr;
          </button>
        </div>
      </div>
    </>
  );
}
