"use client";

import { useState } from "react";
import { Check, Download, Loader2, RefreshCw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useDiscoverAgents,
  useImportAgents,
  type DiscoveredAgent,
  type ImportAgentEntry,
} from "@/lib/api-hooks";
import { cn } from "@/lib/utils";

export function DiscoverAgentsModal({
  open,
  onOpenChange,
  gatewayId,
  gatewayName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gatewayId: string;
  gatewayName: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const discoverQuery = useDiscoverAgents(open ? gatewayId : null);
  const importMutation = useImportAgents();

  const agents =
    discoverQuery.data?.status === 200
      ? (discoverQuery.data.data as DiscoveredAgent[])
      : [];

  const importable = agents.filter((a) => !a.already_imported);

  const toggleSelect = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === importable.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(importable.map((a) => a.name)));
    }
  };

  const handleImport = () => {
    const entries: ImportAgentEntry[] = agents
      .filter((a) => selected.has(a.name))
      .map((a) => ({
        name: a.name,
        gateway_agent_id: a.gateway_agent_id,
        model: a.model,
      }));
    if (entries.length === 0) return;

    importMutation.mutate(
      { gatewayId, agents: entries },
      {
        onSuccess: () => {
          setSelected(new Set());
          void discoverQuery.refetch();
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Discover agents</DialogTitle>
          <DialogDescription>
            Agents found on gateway &quot;{gatewayName}&quot;. Select agents to
            import into your local directory.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-500">
              {agents.length} agent{agents.length !== 1 ? "s" : ""} found
              {importable.length > 0 &&
                ` (${importable.length} importable)`}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void discoverQuery.refetch()}
              disabled={discoverQuery.isFetching}
            >
              <RefreshCw
                className={cn(
                  "h-3.5 w-3.5",
                  discoverQuery.isFetching && "animate-spin",
                )}
              />
              Refresh
            </Button>
          </div>

          {/* Agent list */}
          {discoverQuery.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : discoverQuery.isError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Failed to discover agents. Check gateway connection.
            </div>
          ) : agents.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              No agents found on this gateway.
            </div>
          ) : (
            <>
              {/* Select all */}
              {importable.length > 0 && (
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <input
                    type="checkbox"
                    checked={selected.size === importable.length && importable.length > 0}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span className="text-xs text-slate-500">
                    Select all importable
                  </span>
                </div>
              )}

              <div className="max-h-80 space-y-1 overflow-y-auto">
                {agents.map((agent) => (
                  <div
                    key={agent.name}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border border-slate-100 p-3 transition",
                      agent.already_imported
                        ? "bg-slate-50 opacity-60"
                        : "hover:border-slate-200",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(agent.name)}
                      onChange={() => toggleSelect(agent.name)}
                      disabled={agent.already_imported}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900">
                        {agent.name}
                      </p>
                      <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-400">
                        {agent.status && <span>{agent.status}</span>}
                        {agent.model && <span>{agent.model}</span>}
                      </div>
                    </div>
                    {agent.already_imported && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        <Check className="h-3 w-3" />
                        Imported
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {selected.size > 0 && (
            <Button
              onClick={handleImport}
              disabled={importMutation.isPending}
            >
              <Download className="h-4 w-4" />
              {importMutation.isPending
                ? "Importing..."
                : `Import ${selected.size} agent${selected.size !== 1 ? "s" : ""}`}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
