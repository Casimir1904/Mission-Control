"use client";

import { useState, useCallback } from "react";
import { Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { MemoryEditor } from "./memory-editor";
import { useUpdateMemory, useDeleteMemory } from "@/lib/api/hooks";
import type { BoardMemory } from "@/lib/api/types";

interface MemoryListProps {
  entries: BoardMemory[];
  isLoading: boolean;
}

const SCOPE_COLORS: Record<string, string> = {
  agent: "bg-status-info/20 text-status-info",
  board: "bg-status-healthy/20 text-status-healthy",
  group: "bg-status-warning/20 text-status-warning",
};

function ImportanceBar({ value }: { value: number }) {
  // Map 0-1 to color: low=neutral, mid=warning, high=healthy
  const pct = Math.round(value * 100);
  const color =
    pct >= 70
      ? "bg-status-healthy"
      : pct >= 40
        ? "bg-status-warning"
        : "bg-status-neutral";

  return (
    <div
      className="h-1 w-16 overflow-hidden rounded-full bg-bg-elevated"
      role="meter"
      aria-label={`Importance: ${pct}%`}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full rounded-full transition-all", color)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function MemoryEntrySkeleton() {
  return (
    <div className="border-b border-border-subtle p-space-4">
      <div className="flex items-center gap-space-2 mb-space-2">
        <Skeleton className="h-5 w-14" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-4 w-full mb-space-1" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}

function MemoryEntry({ entry }: { entry: BoardMemory }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const updateMemory = useUpdateMemory();
  const deleteMemory = useDeleteMemory();

  const handleSave = useCallback(
    (data: { content: string; category: string; importance: number }) => {
      updateMemory.mutate(
        {
          id: entry.id,
          data: {
            content: data.content,
            category: data.category,
            importance: data.importance / 100,
          },
        },
        { onSuccess: () => setEditing(false) }
      );
    },
    [entry.id, updateMemory]
  );

  const handleDelete = useCallback(() => {
    deleteMemory.mutate(entry.id);
  }, [entry.id, deleteMemory]);

  if (editing) {
    return (
      <div className="border-b border-border-subtle bg-bg-elevated p-space-4">
        <MemoryEditor
          initialContent={entry.content}
          initialCategory={entry.category}
          initialImportance={Math.round(entry.importance * 100)}
          initialScope={entry.scope}
          onSave={handleSave}
          onCancel={() => setEditing(false)}
          isSaving={updateMemory.isPending}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border-b border-border-subtle p-space-4 transition-colors",
        "hover:bg-bg-elevated cursor-pointer"
      )}
      onClick={() => setExpanded(!expanded)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setExpanded(!expanded);
        }
      }}
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
    >
      {/* Header row */}
      <div className="mb-space-1 flex items-center gap-space-2">
        <span
          className={cn(
            "inline-flex items-center rounded px-space-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            SCOPE_COLORS[entry.scope] ?? "bg-bg-elevated text-text-muted"
          )}
        >
          {entry.scope}
        </span>
        {entry.category && (
          <span className="rounded bg-bg-elevated px-space-2 py-0.5 text-[10px] text-text-muted">
            {entry.category}
          </span>
        )}
        <ImportanceBar value={entry.importance} />
        <span className="ml-auto font-mono text-xs text-text-muted tabular-nums">
          {timeAgo(entry.updated_at)}
        </span>
      </div>

      {/* Content */}
      <p
        className={cn(
          "text-sm text-text-primary",
          !expanded && "line-clamp-3"
        )}
      >
        {entry.content}
      </p>

      {/* Expanded actions */}
      {expanded && (
        <div className="mt-space-3 flex items-center gap-space-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
          >
            <Pencil size={14} aria-hidden="true" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            className="text-status-critical hover:text-status-critical"
          >
            <Trash2 size={14} aria-hidden="true" />
            Delete
          </Button>
        </div>
      )}
    </div>
  );
}

export function MemoryList({ entries, isLoading }: MemoryListProps) {
  if (isLoading) {
    return (
      <div className="rounded-md border border-border-subtle bg-bg-surface">
        {Array.from({ length: 5 }).map((_, i) => (
          <MemoryEntrySkeleton key={i} />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="rounded-md border border-border-subtle bg-bg-surface">
      {entries.map((entry) => (
        <MemoryEntry key={entry.id} entry={entry} />
      ))}
    </div>
  );
}
