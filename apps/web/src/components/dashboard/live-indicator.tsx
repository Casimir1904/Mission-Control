"use client";

import { cn } from "@/lib/utils";

interface LiveIndicatorProps {
  isConnected: boolean;
  className?: string;
}

/**
 * Small pulsing dot indicator for WebSocket connection status.
 * Green dot + "Live" when connected, small amber dot (no text) when reconnecting.
 * The dashboard works fine without WebSocket (polling via TanStack Query),
 * so the disconnected state is informational, not an error.
 */
export function LiveIndicator({ isConnected, className }: LiveIndicatorProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-space-2 text-xs",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <span
        className={cn(
          "relative inline-block rounded-full",
          isConnected ? "h-2 w-2 bg-status-healthy" : "h-1.5 w-1.5 bg-status-warning"
        )}
      >
        {isConnected && (
          <span
            className="absolute inset-0 animate-ping rounded-full bg-status-healthy opacity-75"
            aria-hidden="true"
          />
        )}
      </span>
      {isConnected && (
        <span className="text-status-healthy">Live</span>
      )}
      {/* Screen reader only text when disconnected */}
      {!isConnected && (
        <span className="sr-only">Real-time updates unavailable, using polling</span>
      )}
    </div>
  );
}
