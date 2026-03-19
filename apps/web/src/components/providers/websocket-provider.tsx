"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { WSClient } from "@/lib/ws-client";

const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/ws";

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
 */
export function WebSocketProvider({ children }: { children: ReactNode }) {
  const clientRef = useRef<WSClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const client = new WSClient({ url: WS_BASE_URL });
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
  }, []);

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
