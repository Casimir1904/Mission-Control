"use client";

import { useWebSocketContext } from "@/components/providers/websocket-provider";

/**
 * Hook that uses the app-level WebSocket connection from WebSocketProvider.
 * The WebSocketProvider is mounted in the root Providers component,
 * so this hook simply delegates to the shared context.
 */
export function useWebSocket() {
  const { isConnected, subscribe } = useWebSocketContext();

  return {
    isConnected,
    subscribe,
  };
}
