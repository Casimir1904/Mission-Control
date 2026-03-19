type MessageHandler = (data: unknown) => void;

interface WSClientOptions {
  url: string;
  maxReconnectAttempts?: number;
  baseReconnectDelay?: number;
}

/**
 * WebSocket client with automatic reconnection and exponential backoff.
 * Supports topic-based subscriptions for real-time agent/task updates.
 */
export class WSClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts: number;
  private baseReconnectDelay: number;
  private subscriptions = new Map<string, Set<MessageHandler>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionallyClosed = false;

  constructor(options: WSClientOptions) {
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 10;
    this.baseReconnectDelay = options.baseReconnectDelay ?? 1000;
    this.connect(options.url);
  }

  private connect(url: string) {
    this.intentionallyClosed = false;

    try {
      this.ws = new WebSocket(url);
    } catch {
      this.scheduleReconnect(url);
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      // Re-subscribe to all active topics
      for (const topic of this.subscriptions.keys()) {
        this.sendSubscribe(topic);
      }
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(String(event.data)) as {
          topic?: string;
          data?: unknown;
        };
        if (payload.topic) {
          const handlers = this.subscriptions.get(payload.topic);
          if (handlers) {
            handlers.forEach((handler) => handler(payload.data));
          }
        }
      } catch {
        // Ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      if (!this.intentionallyClosed) {
        this.scheduleReconnect(url);
      }
    };

    this.ws.onerror = () => {
      // onclose will fire after onerror, triggering reconnect
    };
  }

  private scheduleReconnect(url: string) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    // Exponential backoff with jitter
    const delay =
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts) +
      Math.random() * 1000;

    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.connect(url);
    }, delay);
  }

  private sendSubscribe(topic: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: "subscribe", topic }));
    }
  }

  private sendUnsubscribe(topic: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: "unsubscribe", topic }));
    }
  }

  subscribe(topic: string, handler: MessageHandler): () => void {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());
      this.sendSubscribe(topic);
    }

    this.subscriptions.get(topic)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.subscriptions.get(topic);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.subscriptions.delete(topic);
          this.sendUnsubscribe(topic);
        }
      }
    };
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  close() {
    this.intentionallyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.ws?.close();
    this.ws = null;
    this.subscriptions.clear();
  }
}
