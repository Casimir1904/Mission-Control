"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCreateChatSession } from "@/lib/api-hooks";

// Minimal types for agents/gateways from existing API
type AgentInfo = { id: string; name: string };
type GatewayInfo = { id: string; name: string };

export function NewChatDialog({
  open,
  onOpenChange,
  onCreated,
  gateways,
  agents,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (sessionId: string) => void;
  gateways: GatewayInfo[];
  agents: AgentInfo[];
}) {
  const [title, setTitle] = useState("");
  const [selectedGateway, setSelectedGateway] = useState(
    gateways[0]?.id ?? "",
  );
  const [selectedAgent, setSelectedAgent] = useState("");
  const createMutation = useCreateChatSession();

  // Sync selectedGateway when gateways load after mount
  useEffect(() => {
    if (!selectedGateway && gateways.length > 0) {
      setSelectedGateway(gateways[0].id);
    }
  }, [gateways, selectedGateway]);

  const handleCreate = () => {
    if (!selectedGateway) return;
    createMutation.mutate(
      {
        gateway_id: selectedGateway,
        agent_id: selectedAgent || undefined,
        title: title || undefined,
      },
      {
        onSuccess: (data) => {
          if (data.data?.id) {
            onCreated(data.data.id);
          }
          onOpenChange(false);
          setTitle("");
          setSelectedAgent("");
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New chat</DialogTitle>
          <DialogDescription>
            Start a conversation with an agent through a gateway.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium text-slate-700">
              Title (optional)
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Chat title..."
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">
              Gateway
            </label>
            <select
              value={selectedGateway}
              onChange={(e) => setSelectedGateway(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {gateways.length === 0 && (
                <option value="">No gateways available</option>
              )}
              {gateways.map((gw) => (
                <option key={gw.id} value={gw.id}>
                  {gw.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">
              Agent (optional)
            </label>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Any agent</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!selectedGateway || createMutation.isPending}
          >
            {createMutation.isPending ? "Creating..." : "Start chat"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
