"use client";

import { useState } from "react";
import { Crown, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useUpdateBoard } from "@/lib/api/hooks";
import type { Agent } from "@/lib/api/types";

interface LeadAgentSelectorProps {
  boardId: string;
  agents: Agent[];
  currentLeadId?: string;
  className?: string;
}

export function LeadAgentSelector({
  boardId,
  agents,
  currentLeadId,
  className,
}: LeadAgentSelectorProps) {
  const [selectedId, setSelectedId] = useState(currentLeadId ?? "none");
  const updateBoard = useUpdateBoard();

  const hasChanged = selectedId !== (currentLeadId ?? "none");
  const currentLead = agents.find((a) => a.id === currentLeadId);

  const handleSave = () => {
    updateBoard.mutate({
      id: boardId,
      data: {
        lead_agent_id: selectedId === "none" ? null : selectedId,
      },
    });
  };

  return (
    <div className={cn("space-y-space-3", className)}>
      <div>
        <h3 className="flex items-center gap-space-2 text-sm font-semibold text-text-primary">
          <Crown size={14} className="text-accent-primary" aria-hidden="true" />
          Lead Agent
        </h3>
        <p className="mt-space-1 text-xs text-text-muted">
          The lead agent plans tasks, asks questions, and assigns work to other
          agents on this board.
        </p>
      </div>

      <div className="flex items-center gap-space-2">
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger className="w-[260px]">
            <SelectValue placeholder="No lead agent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              <span className="text-text-muted">No lead agent</span>
            </SelectItem>
            {agents.map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                <span className="flex items-center gap-space-2">
                  <span>{agent.name}</span>
                  <span className="text-text-muted text-[10px]">{agent.role}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasChanged && (
          <div className="flex items-center gap-space-1">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={updateBoard.isPending}
            >
              <Check size={12} className="mr-1" aria-hidden="true" />
              {updateBoard.isPending ? "Saving..." : "Set as Lead"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedId(currentLeadId ?? "none")}
            >
              <X size={12} aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>

      {currentLead && !hasChanged && (
        <div className="flex items-center gap-space-2 rounded-md border border-accent-primary/20 bg-accent-primary/5 px-space-3 py-space-2">
          <Crown size={12} className="text-accent-primary shrink-0" aria-hidden="true" />
          <span className="text-xs text-text-secondary">
            <span className="font-medium text-text-primary">{currentLead.name}</span>
            {" "}is the lead agent for this board
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Compact badge for the board header showing lead agent.
 */
export function LeadAgentBadge({
  agentName,
  className,
}: {
  agentName: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-space-1 rounded-md border border-accent-primary/30 bg-accent-primary/10 px-space-2 py-0.5 text-xs font-medium text-accent-primary",
        className
      )}
    >
      <Crown size={10} aria-hidden="true" />
      Lead: {agentName}
    </span>
  );
}
