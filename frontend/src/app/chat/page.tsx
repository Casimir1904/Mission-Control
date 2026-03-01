"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";

import { SignedIn, SignedOut } from "@/auth/clerk";
import { SignedOutPanel } from "@/components/auth/SignedOutPanel";
import { DashboardSidebar } from "@/components/organisms/DashboardSidebar";
import { DashboardShell } from "@/components/templates/DashboardShell";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatView } from "@/components/chat/ChatView";
import { NewChatDialog } from "@/components/chat/NewChatDialog";
import { useListAgentsApiV1AgentsGet } from "@/api/generated/agents/agents";
import { useListGatewaysApiV1GatewaysGet } from "@/api/generated/gateways/gateways";

export default function ChatPage() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [newChatOpen, setNewChatOpen] = useState(false);

  const gatewaysQuery = useListGatewaysApiV1GatewaysGet({ limit: 100 });
  const agentsQuery = useListAgentsApiV1AgentsGet({ limit: 100 });

  const gateways =
    gatewaysQuery.data?.status === 200
      ? (gatewaysQuery.data.data?.items ?? []).map((gw) => ({
          id: gw.id,
          name: gw.name,
        }))
      : [];

  const agents =
    agentsQuery.data?.status === 200
      ? (agentsQuery.data.data?.items ?? []).map((a) => ({
          id: a.id,
          name: a.name,
        }))
      : [];

  return (
    <DashboardShell>
      <SignedOut>
        <SignedOutPanel
          message="Sign in to access chat"
          forceRedirectUrl="/chat"
        />
      </SignedOut>
      <SignedIn>
        <DashboardSidebar />
        <div className="flex flex-1 overflow-hidden">
          <ChatSidebar
            activeSessionId={activeSessionId}
            onSelectSession={setActiveSessionId}
            onNewChat={() => setNewChatOpen(true)}
          />
          <div className="flex flex-1 flex-col bg-white">
            {activeSessionId ? (
              <ChatView sessionId={activeSessionId} />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-slate-400">
                <MessageSquare className="h-12 w-12" />
                <p className="text-sm">
                  Select a chat or start a new conversation
                </p>
              </div>
            )}
          </div>
        </div>
        <NewChatDialog
          open={newChatOpen}
          onOpenChange={setNewChatOpen}
          onCreated={(id) => setActiveSessionId(id)}
          gateways={gateways}
          agents={agents}
        />
      </SignedIn>
    </DashboardShell>
  );
}
