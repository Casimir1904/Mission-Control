"use client";

import { useEffect, useRef } from "react";
import { Bot, Loader2, User } from "lucide-react";

import {
  useListChatMessages,
  useSendChatMessage,
  usePollAgentResponse,
  type ChatMessageRead,
} from "@/lib/api-hooks";
import { cn } from "@/lib/utils";

import { ChatInput } from "./ChatInput";

function MessageBubble({ message }: { message: ChatMessageRead }) {
  const isUser = message.sender_type === "user";
  return (
    <div
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-blue-100 text-blue-700"
            : "bg-slate-100 text-slate-700",
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          "max-w-[70%] rounded-2xl px-4 py-2.5 text-sm",
          isUser
            ? "bg-blue-600 text-white"
            : "bg-slate-100 text-slate-900",
        )}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        <p
          className={cn(
            "mt-1 text-[10px]",
            isUser ? "text-blue-200" : "text-slate-400",
          )}
        >
          {new Date(message.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}

export function ChatView({ sessionId }: { sessionId: string }) {
  const messagesQuery = useListChatMessages(sessionId, {
    refetchInterval: 3000,
  });
  const sendMutation = useSendChatMessage();
  const pollMutation = usePollAgentResponse();
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messages =
    messagesQuery.data?.status === 200
      ? (messagesQuery.data.data as ChatMessageRead[])
      : [];

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Poll for agent response after sending a message
  const startPolling = () => {
    let attempts = 0;
    const poll = () => {
      if (attempts >= 20) return;
      attempts++;
      pollMutation.mutate(sessionId);
      pollTimerRef.current = setTimeout(poll, 2000);
    };
    pollTimerRef.current = setTimeout(poll, 1500);
  };

  // Clean up poll timer
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  const handleSend = (content: string) => {
    sendMutation.mutate(
      { sessionId, content },
      {
        onSuccess: () => {
          if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
          startPolling();
        },
      },
    );
  };

  if (!sessionId) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
        Select or create a chat session
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-6">
        {messagesQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bot className="h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">
              No messages yet. Send a message to start the conversation.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {sendMutation.isPending && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={sendMutation.isPending} />
    </div>
  );
}
