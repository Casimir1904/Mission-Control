"use client";

import { useState } from "react";
import { Bot, MessageSquarePlus, Search, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useListChatSessions,
  useArchiveChatSession,
  type ChatSessionRead,
} from "@/lib/api-hooks";
import { cn } from "@/lib/utils";

export function ChatSidebar({
  activeSessionId,
  onSelectSession,
  onNewChat,
}: {
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
}) {
  const [search, setSearch] = useState("");
  const sessionsQuery = useListChatSessions(undefined, {
    refetchInterval: 10000,
  });
  const archiveMutation = useArchiveChatSession();

  const sessions =
    sessionsQuery.data?.status === 200
      ? (sessionsQuery.data.data as ChatSessionRead[])
      : [];

  const filtered = search
    ? sessions.filter(
        (s) =>
          s.title?.toLowerCase().includes(search.toLowerCase()) ||
          s.id.includes(search),
      )
    : sessions;

  return (
    <div className="flex h-full w-72 flex-col border-r border-slate-200 bg-white">
      {/* Header */}
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Chats</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={onNewChat}
            className="h-8 gap-1 text-xs"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
            New
          </Button>
        </div>
        <div className="relative mt-3">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats..."
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-400">
            {sessions.length === 0
              ? "No chat sessions yet"
              : "No matching sessions"}
          </div>
        ) : (
          <div className="space-y-0.5 p-2">
            {filtered.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => onSelectSession(session.id)}
                className={cn(
                  "group flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition",
                  activeSessionId === session.id
                    ? "bg-blue-50 text-blue-900"
                    : "text-slate-700 hover:bg-slate-50",
                )}
              >
                <Bot className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {session.title || `Chat ${session.id.slice(0, 8)}`}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    {new Date(session.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    archiveMutation.mutate(session.id);
                  }}
                  className="mt-0.5 hidden shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 group-hover:block"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
