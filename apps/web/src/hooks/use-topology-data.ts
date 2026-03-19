"use client";

import { useMemo } from "react";
import { useAgents, useBoards, useGateways } from "@/lib/api/hooks";
import type { Agent, Board, Gateway, AgentStatus } from "@/lib/api/types";

// ── Node and Edge types for the topology graph ──

export type TopologyNodeType = "agent" | "board" | "gateway";

export interface TopologyNode {
  id: string;
  label: string;
  type: TopologyNodeType;
  status?: AgentStatus | "connected" | "disconnected" | "active" | "archived";
  color: string;
  size: number;
  // Original entity for tooltip details
  entity: Agent | Board | Gateway;
  // Entity-specific details
  detailUrl: string;
  agentCount?: number;
  currentTask?: string;
  role?: string;
  gatewayUrl?: string;
}

export interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  color: string;
  type: "agent-board" | "gateway-agent" | "board-group";
}

export interface TopologyData {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  isEmpty: boolean;
}

// ── Color constants matching DESIGN.md ──

const COLORS = {
  agentOnline: "#10B981",    // status-healthy
  agentOffline: "#EF4444",   // status-critical
  agentDegraded: "#F59E0B",  // status-warning
  agentProvisioning: "#6B7280", // status-neutral
  board: "#3B82F6",          // accent-primary
  gateway: "#8B5CF6",        // purple
  edge: "rgba(42, 42, 46, 0.6)", // border-default, semi-transparent
} as const;

// ── Sizes ──

const SIZES = {
  gateway: 20,
  board: 15,
  agent: 8,
} as const;

function getAgentColor(status: AgentStatus): string {
  switch (status) {
    case "online":
      return COLORS.agentOnline;
    case "offline":
      return COLORS.agentOffline;
    case "degraded":
      return COLORS.agentDegraded;
    case "provisioning":
      return COLORS.agentProvisioning;
    default:
      return COLORS.agentProvisioning;
  }
}

export function useTopologyData(): TopologyData & {
  isLoading: boolean;
  isError: boolean;
} {
  const {
    data: agentsData,
    isLoading: agentsLoading,
    isError: agentsError,
  } = useAgents({ per_page: 100 });

  const {
    data: boardsData,
    isLoading: boardsLoading,
    isError: boardsError,
  } = useBoards({ per_page: 100 });

  const {
    data: gatewaysData,
    isLoading: gatewaysLoading,
    isError: gatewaysError,
  } = useGateways({ per_page: 100 });

  const isLoading = agentsLoading || boardsLoading || gatewaysLoading;
  const isError = agentsError || boardsError || gatewaysError;

  const topologyData = useMemo(() => {
    const agents = agentsData?.items ?? [];
    const boards = boardsData?.items ?? [];
    const gateways = gatewaysData?.items ?? [];

    const nodes: TopologyNode[] = [];
    const edges: TopologyEdge[] = [];

    // Track which boards and gateways are referenced for edge creation
    const boardIds = new Set(boards.map((b) => b.id));
    const gatewayIds = new Set(gateways.map((g) => g.id));

    // ── Gateway nodes ──
    for (const gateway of gateways) {
      nodes.push({
        id: `gateway-${gateway.id}`,
        label: gateway.name,
        type: "gateway",
        status: gateway.status,
        color: COLORS.gateway,
        size: SIZES.gateway,
        entity: gateway,
        detailUrl: `/gateways/${gateway.id}`,
        agentCount: gateway.agent_count,
        gatewayUrl: gateway.url,
      });
    }

    // ── Board nodes ──
    for (const board of boards) {
      nodes.push({
        id: `board-${board.id}`,
        label: board.name,
        type: "board",
        status: board.status,
        color: COLORS.board,
        size: SIZES.board,
        entity: board,
        detailUrl: `/boards/${board.id}`,
        agentCount: board.agent_count,
      });

      // Board -> BoardGroup edges (if board_group_id exists and another board has the same group)
      if (board.board_group_id) {
        const groupBoards = boards.filter(
          (b) => b.board_group_id === board.board_group_id && b.id !== board.id
        );
        for (const otherBoard of groupBoards) {
          // Only add edge once (alphabetically by id to deduplicate)
          if (board.id < otherBoard.id) {
            edges.push({
              id: `group-${board.id}-${otherBoard.id}`,
              source: `board-${board.id}`,
              target: `board-${otherBoard.id}`,
              color: COLORS.edge,
              type: "board-group",
            });
          }
        }
      }
    }

    // ── Agent nodes + edges ──
    for (const agent of agents) {
      nodes.push({
        id: `agent-${agent.id}`,
        label: agent.name,
        type: "agent",
        status: agent.status,
        color: getAgentColor(agent.status),
        size: SIZES.agent,
        entity: agent,
        detailUrl: `/agents/${agent.id}`,
        currentTask: agent.current_task,
        role: agent.role,
      });

      // Agent -> Board edge
      if (agent.board_id && boardIds.has(agent.board_id)) {
        edges.push({
          id: `agent-board-${agent.id}`,
          source: `agent-${agent.id}`,
          target: `board-${agent.board_id}`,
          color: COLORS.edge,
          type: "agent-board",
        });
      }

      // Gateway -> Agent edge
      if (agent.gateway_id && gatewayIds.has(agent.gateway_id)) {
        edges.push({
          id: `gateway-agent-${agent.gateway_id}-${agent.id}`,
          source: `gateway-${agent.gateway_id}`,
          target: `agent-${agent.id}`,
          color: COLORS.edge,
          type: "gateway-agent",
        });
      }
    }

    const isEmpty = nodes.length === 0;

    return { nodes, edges, isEmpty };
  }, [agentsData, boardsData, gatewaysData]);

  return {
    ...topologyData,
    isLoading,
    isError,
  };
}
