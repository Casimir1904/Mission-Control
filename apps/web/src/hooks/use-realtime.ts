"use client";

import { useEffect, useCallback, useRef, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWebSocket } from "./use-websocket";
import { queryKeys } from "@/lib/api/hooks";

interface RealtimeEvent {
  topic: string;
  event_type: string;
  entity_type?: string;
  entity_id?: string;
  payload?: Record<string, unknown>;
}

/**
 * Higher-level hook combining WebSocket subscriptions with TanStack Query cache invalidation.
 * Subscribes to topics and automatically invalidates relevant queries on events.
 */
export function useRealtime(topics: string[]) {
  const queryClient = useQueryClient();
  const { isConnected, subscribe } = useWebSocket();
  const lastMessageRef = useRef<RealtimeEvent | null>(null);

  // Stabilize topics array to avoid re-subscribing on every render
  const topicsKey = topics.join(",");
  const stableTopics = useMemo(() => topics, [topicsKey]);

  const handleMessage = useCallback(
    (data: unknown) => {
      const event = data as RealtimeEvent;
      lastMessageRef.current = event;

      // Route event to appropriate query invalidation
      const topic = event.topic ?? "";
      const entityType = event.entity_type ?? "";

      if (topic === "dashboard" || entityType === "dashboard") {
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      }

      if (
        topic.startsWith("board:") ||
        entityType === "board" ||
        entityType === "task"
      ) {
        queryClient.invalidateQueries({ queryKey: queryKeys.boards.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      }

      if (topic === "approvals" || entityType === "approval") {
        queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      }

      if (entityType === "agent") {
        queryClient.invalidateQueries({ queryKey: queryKeys.agents.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      }

      if (topic === "activity" || entityType === "activity") {
        queryClient.invalidateQueries({ queryKey: queryKeys.activity.all });
      }

      // Phase 3: Notifications
      if (topic === "notifications" || entityType === "notification") {
        queryClient.invalidateQueries({
          queryKey: queryKeys.notifications.all,
        });
      }

      // Phase 3: Memory
      if (entityType === "memory") {
        queryClient.invalidateQueries({ queryKey: queryKeys.memory.all });
      }

      // Phase 3: Costs
      if (entityType === "cost") {
        queryClient.invalidateQueries({ queryKey: queryKeys.costs.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      }

      // Phase 3: Traces
      if (entityType === "trace") {
        queryClient.invalidateQueries({ queryKey: queryKeys.traces.all });
      }

      // Phase 3: Gateways
      if (entityType === "gateway") {
        queryClient.invalidateQueries({ queryKey: queryKeys.gateways.all });
      }
    },
    [queryClient]
  );

  useEffect(() => {
    const unsubscribers = stableTopics.map((topic) =>
      subscribe(topic, handleMessage)
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [stableTopics, subscribe, handleMessage]);

  return {
    isConnected,
    lastMessage: lastMessageRef.current,
  };
}

/** Stable topic arrays to avoid re-creating on every render */
const DASHBOARD_TOPICS = [
  "dashboard",
  "approvals",
  "activity",
  "notifications",
];

/**
 * Subscribe to dashboard real-time updates.
 * Invalidates dashboard query on any dashboard event.
 */
export function useRealtimeDashboard() {
  return useRealtime(DASHBOARD_TOPICS);
}

/**
 * Subscribe to board-specific real-time updates.
 * Invalidates board, task, and agent queries on board events.
 */
export function useRealtimeBoard(boardId: string) {
  const topics = useMemo(() => [`board:${boardId}`], [boardId]);
  return useRealtime(topics);
}
