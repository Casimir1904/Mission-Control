"use client";

import { useState } from "react";
import { MessageSquarePlus, MessageCircle, Bot, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/status/empty-state";
import { cn } from "@/lib/utils";
import type { ChatSession, Agent } from "@/lib/api/types";

interface SessionPickerProps {
  sessions: ChatSession[];
  agents: Agent[];
  isLoading: boolean;
  onSelectSession: (session: ChatSession) => void;
  onNewSession: (agentId: string) => void;
}

/**
 * Format ISO timestamp to a relative "time ago" string.
 */
function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return "just now";

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function SessionPicker({
  sessions,
  agents,
  isLoading,
  onSelectSession,
  onNewSession,
}: SessionPickerProps) {
  const [showAgentSelect, setShowAgentSelect] = useState(false);

  const activeSessions = sessions.filter((s) => s.status === "active");
  const onlineAgents = agents.filter(
    (a) => a.status === "online" && a.gateway_id
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-space-3 p-space-4">
        <Skeleton className="h-5 w-32" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {/* New chat section */}
      <div className="border-b border-border-subtle p-space-4">
        {showAgentSelect ? (
          <div className="space-y-space-2">
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Select an agent
            </p>
            {onlineAgents.length === 0 ? (
              <p className="text-xs text-text-muted py-space-2">
                No agents with gateways are online.
              </p>
            ) : (
              onlineAgents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => {
                    onNewSession(agent.id);
                    setShowAgentSelect(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-space-3 rounded-md px-space-3 py-space-2 text-left",
                    "hover:bg-bg-elevated transition-colors"
                  )}
                >
                  <Bot size={14} className="shrink-0 text-text-muted" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {agent.name}
                    </p>
                    <p className="text-xs text-text-muted truncate">
                      {agent.role}
                    </p>
                  </div>
                </button>
              ))
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAgentSelect(false)}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => setShowAgentSelect(true)}
            className="w-full"
            size="sm"
          >
            <MessageSquarePlus size={14} aria-hidden="true" />
            New Chat
          </Button>
        )}
      </div>

      {/* Active sessions */}
      <div className="flex-1 p-space-4">
        {activeSessions.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="No active chats"
            description="Start a new chat with an agent to begin."
            className="py-space-8"
          />
        ) : (
          <div className="space-y-space-1">
            <p className="mb-space-2 text-xs font-medium uppercase tracking-wider text-text-muted">
              Active Sessions
            </p>
            {activeSessions.map((session) => (
              <button
                key={session.session_key}
                onClick={() => onSelectSession(session)}
                className={cn(
                  "flex w-full items-start gap-space-3 rounded-md px-space-3 py-space-3 text-left",
                  "border border-border-subtle hover:border-border-default hover:bg-bg-elevated transition-colors"
                )}
              >
                <Bot
                  size={14}
                  className="mt-0.5 shrink-0 text-accent-primary"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-space-2">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {session.agent_name}
                    </p>
                    <span className="shrink-0 font-mono text-[10px] text-text-muted">
                      {formatRelativeTime(session.created_at)}
                    </span>
                  </div>
                  {session.task_id && (
                    <div className="mt-space-1 flex items-center gap-space-1 text-xs text-text-muted">
                      <ListTodo size={10} aria-hidden="true" />
                      <span className="truncate">Task linked</span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
