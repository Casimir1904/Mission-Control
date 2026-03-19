"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { X, MessageCircle, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MessageBubble } from "./message-bubble";
import { ChatInput, ThinkingDots } from "./chat-input";
import { SessionPicker } from "./session-picker";
import { useWebSocket } from "@/hooks/use-websocket";
import {
  useBoardSessions,
  useChatHistory,
  useCreateChatSession,
  useSendMessage,
  useAbortGeneration,
  useEndSession,
} from "@/lib/api/hooks";
import { useAgentsByBoard } from "@/lib/api/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/hooks";
import type { ChatSession, ChatMessage, AgentAction } from "@/lib/api/types";

interface ChatPanelProps {
  boardId: string;
  isOpen: boolean;
  onClose: () => void;
  /** Pre-select a specific session (e.g., from task dispatch) */
  initialSessionKey?: string;
  /** Pre-select an agent for new session */
  initialAgentId?: string;
}

type AgentState = "idle" | "thinking" | "tool_use" | "writing" | "responding";

export function ChatPanel({
  boardId,
  isOpen,
  onClose,
  initialSessionKey,
  initialAgentId,
}: ChatPanelProps) {
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [agentState, setAgentState] = useState<AgentState>("idle");
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>(
    []
  );
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();
  const { isConnected, subscribe } = useWebSocket();

  // API hooks
  const { data: sessions = [], isLoading: sessionsLoading } =
    useBoardSessions(boardId);
  const { data: agentsData } = useAgentsByBoard(boardId);
  const agents = agentsData?.items ?? [];

  const sessionKey = activeSession?.session_key ?? "";
  const {
    data: messages = [],
    isLoading: messagesLoading,
  } = useChatHistory(sessionKey);

  const createSession = useCreateChatSession();
  const sendMessage = useSendMessage();
  const abortGeneration = useAbortGeneration();
  const endSession = useEndSession();

  // Portal mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle initial session/agent
  useEffect(() => {
    if (!isOpen) return;

    if (initialSessionKey && sessions.length > 0) {
      const found = sessions.find(
        (s) => s.session_key === initialSessionKey
      );
      if (found) {
        setActiveSession(found);
        return;
      }
    }

    if (initialAgentId) {
      handleNewSession(initialAgentId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialSessionKey, initialAgentId, sessions]);

  // Subscribe to WebSocket events for real-time messages
  useEffect(() => {
    if (!boardId || !isOpen) return;

    const unsubscribe = subscribe(`board:${boardId}`, (data: unknown) => {
      const event = data as {
        event_type?: string;
        payload?: Record<string, unknown>;
      };

      if (!event.event_type) return;

      switch (event.event_type) {
        case "chat.message": {
          const payload = event.payload;
          if (!payload) break;

          // If this message belongs to the active session, add it
          if (
            payload.session_key === sessionKey
          ) {
            // Remove optimistic messages and invalidate the cache
            setOptimisticMessages([]);
            queryClient.invalidateQueries({
              queryKey: queryKeys.chat.messages(sessionKey),
            });
            setAgentState("idle");
          }
          break;
        }

        case "agent.state": {
          const payload = event.payload;
          if (!payload) break;

          // Update agent state indicator
          if (
            activeSession &&
            payload.agent_id === activeSession.agent_id
          ) {
            setAgentState(
              (payload.action as AgentAction) ?? "idle"
            );
          }
          break;
        }
      }
    });

    return unsubscribe;
  }, [
    boardId,
    isOpen,
    subscribe,
    sessionKey,
    activeSession,
    queryClient,
  ]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, optimisticMessages]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Use timeout to avoid catching the opening click
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleNewSession = useCallback(
    (agentId: string) => {
      createSession.mutate(
        { boardId, data: { agent_id: agentId } },
        {
          onSuccess: (session) => {
            setActiveSession(session);
            setOptimisticMessages([]);
            setAgentState("idle");
          },
        }
      );
    },
    [boardId, createSession]
  );

  const handleSendMessage = useCallback(
    (content: string) => {
      if (!sessionKey) return;

      // Optimistic update: add user message immediately
      const optimisticMsg: ChatMessage = {
        id: `optimistic-${Date.now()}`,
        session_key: sessionKey,
        role: "user",
        content,
        created_at: new Date().toISOString(),
      };

      setOptimisticMessages((prev) => [...prev, optimisticMsg]);
      setAgentState("thinking");

      sendMessage.mutate(
        { sessionKey, data: { content } },
        {
          onSuccess: () => {
            // The optimistic message will be replaced by the real one
            // when the WebSocket event arrives
          },
          onError: () => {
            // Remove optimistic message on error
            setOptimisticMessages((prev) =>
              prev.filter((m) => m.id !== optimisticMsg.id)
            );
            setAgentState("idle");
          },
        }
      );
    },
    [sessionKey, sendMessage]
  );

  const handleAbort = useCallback(() => {
    if (sessionKey) {
      abortGeneration.mutate(sessionKey);
      setAgentState("idle");
    }
  }, [sessionKey, abortGeneration]);

  const handleEndSession = useCallback(() => {
    if (sessionKey) {
      endSession.mutate(sessionKey, {
        onSuccess: () => {
          setActiveSession(null);
          setOptimisticMessages([]);
          setAgentState("idle");
        },
      });
    }
  }, [sessionKey, endSession]);

  const handleBack = useCallback(() => {
    setActiveSession(null);
    setOptimisticMessages([]);
    setAgentState("idle");
  }, []);

  // Combine real messages with optimistic ones
  const allMessages = [
    ...messages,
    ...optimisticMessages.filter(
      (om) => !messages.some((m) => m.content === om.content && m.role === om.role)
    ),
  ];

  const isAgentActive =
    agentState === "thinking" ||
    agentState === "tool_use" ||
    agentState === "writing" ||
    agentState === "responding";

  if (!mounted || !isOpen) return null;

  const panelContent = (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-[400px] max-w-[90vw] flex-col",
          "border-l border-border-subtle bg-bg-base shadow-2xl",
          "animate-slide-in-right"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Chat panel"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border-subtle px-space-4 py-space-3">
          <div className="flex items-center gap-space-2 min-w-0">
            <MessageCircle
              size={16}
              className="shrink-0 text-accent-primary"
              aria-hidden="true"
            />
            {activeSession ? (
              <div className="min-w-0">
                <div className="flex items-center gap-space-2">
                  <span className="truncate text-sm font-medium text-text-primary">
                    {activeSession.agent_name}
                  </span>
                  {isAgentActive && (
                    <ThinkingDots />
                  )}
                </div>
                {activeSession.task_id && (
                  <p className="truncate text-xs text-text-muted">
                    Task session
                  </p>
                )}
              </div>
            ) : (
              <span className="text-sm font-medium text-text-primary">
                Chat
              </span>
            )}
          </div>

          <div className="flex items-center gap-space-1">
            {!isConnected && (
              <Badge variant="warning" className="mr-space-1">
                <WifiOff size={10} className="mr-1" aria-hidden="true" />
                Offline
              </Badge>
            )}
            {activeSession && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="text-xs"
                >
                  Sessions
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEndSession}
                  className="text-xs text-status-critical hover:text-status-critical"
                >
                  End
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close chat panel"
            >
              <X size={16} aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* Content area */}
        {activeSession ? (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto">
              {messagesLoading ? (
                <div className="space-y-space-3 p-space-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex",
                        i % 2 === 0 ? "justify-end" : "justify-start"
                      )}
                    >
                      <Skeleton
                        className={cn(
                          "h-12 rounded-md",
                          i % 2 === 0 ? "w-2/3" : "w-3/4"
                        )}
                      />
                    </div>
                  ))}
                </div>
              ) : allMessages.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center p-space-8 text-center">
                  <MessageCircle
                    size={32}
                    className="mb-space-3 text-text-muted"
                    aria-hidden="true"
                  />
                  <p className="text-sm text-text-secondary">
                    Start a conversation with {activeSession.agent_name}
                  </p>
                  <p className="mt-space-1 text-xs text-text-muted">
                    Type a message below to begin.
                  </p>
                </div>
              ) : (
                <div className="py-space-2">
                  {allMessages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                  ))}

                  {/* Thinking indicator when agent is active but no message yet */}
                  {isAgentActive && (
                    <div className="flex items-center gap-space-2 px-space-4 py-space-2">
                      <ThinkingDots />
                      <span className="text-xs text-text-muted">
                        {agentState === "thinking" && "Thinking..."}
                        {agentState === "tool_use" && "Using tool..."}
                        {agentState === "writing" && "Writing..."}
                        {agentState === "responding" && "Responding..."}
                      </span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Connection lost banner */}
            {!isConnected && (
              <div className="flex items-center gap-space-2 border-t border-status-warning/30 bg-status-warning/10 px-space-4 py-space-2">
                <WifiOff
                  size={12}
                  className="shrink-0 text-status-warning"
                  aria-hidden="true"
                />
                <p className="text-xs text-status-warning">
                  Connection lost. Messages may be delayed.
                </p>
              </div>
            )}

            {/* Input */}
            <ChatInput
              onSend={handleSendMessage}
              onAbort={handleAbort}
              isGenerating={isAgentActive}
              isDisabled={!isConnected && !sessionKey}
            />
          </>
        ) : (
          <SessionPicker
            sessions={sessions}
            agents={agents}
            isLoading={sessionsLoading}
            onSelectSession={(session) => {
              setActiveSession(session);
              setOptimisticMessages([]);
              setAgentState("idle");
            }}
            onNewSession={handleNewSession}
          />
        )}
      </div>
    </>
  );

  if (typeof document === "undefined") return null;
  return createPortal(panelContent, document.body);
}
