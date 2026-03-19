"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { WSClient } from "@/lib/ws-client";

/**
 * Derive the WebSocket URL from the API URL at runtime.
 * Replaces http(s):// with ws(s):// and appends /ws.
 * Falls back to NEXT_PUBLIC_WS_URL if explicitly set.
 */
function deriveWsUrl(): string | null {
  // Allow explicit override if set
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  // Replace protocol: https -> wss, http -> ws
  const wsUrl = apiUrl
    .replace(/^https:\/\//, "wss://")
    .replace(/^http:\/\//, "ws://");

  // Strip trailing slash and append /ws
  return `${wsUrl.replace(/\/$/, "")}/ws`;
}

interface WebSocketContextValue {
  isConnected: boolean;
  subscribe: (topic: string, handler: (data: unknown) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextValue>({
  isConnected: false,
  subscribe: () => () => {},
});

/**
 * App-level WebSocket provider.
 * Establishes a single WS connection shared across all components.
 * The WS URL is derived from NEXT_PUBLIC_API_URL at runtime.
 */
export function WebSocketProvider({ children }: { children: ReactNode }) {
  const clientRef = useRef<WSClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const wsUrl = useMemo(() => deriveWsUrl(), []);

  useEffect(() => {
    if (!wsUrl) return;

    const client = new WSClient({ url: wsUrl });
    clientRef.current = client;

    // Poll connection status
    const interval = setInterval(() => {
      setIsConnected(client.isConnected);
    }, 1000);

    return () => {
      clearInterval(interval);
      client.close();
      clientRef.current = null;
    };
  }, [wsUrl]);

  const subscribe = useCallback(
    (topic: string, handler: (data: unknown) => void) => {
      if (!clientRef.current) {
        return () => {};
      }
      return clientRef.current.subscribe(topic, handler);
    },
    []
  );

  return (
    <WebSocketContext.Provider value={{ isConnected, subscribe }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  return useContext(WebSocketContext);
}
