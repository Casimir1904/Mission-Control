"use client";

import { cn } from "@/lib/utils";

interface LiveIndicatorProps {
  isConnected: boolean;
  className?: string;
}

/**
 * Small pulsing dot indicator for WebSocket connection status.
 * Green + "Live" when connected, amber + "Reconnecting..." when disconnected.
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
          "relative inline-block h-2 w-2 rounded-full",
          isConnected ? "bg-status-healthy" : "bg-status-warning"
        )}
      >
        {isConnected && (
          <span
            className="absolute inset-0 animate-ping rounded-full bg-status-healthy opacity-75"
            aria-hidden="true"
          />
        )}
      </span>
      <span
        className={cn(
          isConnected ? "text-status-healthy" : "text-status-warning"
        )}
      >
        {isConnected ? "Live" : "Reconnecting..."}
      </span>
    </div>
  );
}
