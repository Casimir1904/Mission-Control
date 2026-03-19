"use client";

import { useBoards } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";

interface MemoryFiltersProps {
  boardId: string;
  onBoardChange: (id: string) => void;
  category: string;
  onCategoryChange: (cat: string) => void;
  scope: string;
  onScopeChange: (scope: string) => void;
  categories: string[];
}

const SCOPE_OPTIONS = [
  { value: "", label: "All Scopes" },
  { value: "agent", label: "Agent" },
  { value: "board", label: "Board" },
  { value: "group", label: "Group" },
];

export function MemoryFilters({
  boardId,
  onBoardChange,
  category,
  onCategoryChange,
  scope,
  onScopeChange,
  categories,
}: MemoryFiltersProps) {
  const { data: boards } = useBoards();

  return (
    <div className="flex flex-wrap items-center gap-space-3">
      {/* Board selector */}
      <select
        value={boardId}
        onChange={(e) => onBoardChange(e.target.value)}
        className={cn(
          "h-9 rounded-md border border-border-default bg-bg-base px-space-3 text-sm text-text-primary",
          "focus:outline-none focus:ring-2 focus:ring-border-strong focus:ring-offset-2 focus:ring-offset-bg-base"
        )}
        aria-label="Filter by board"
      >
        <option value="">All Boards</option>
        {boards?.items?.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>

      {/* Category selector */}
      <select
        value={category}
        onChange={(e) => onCategoryChange(e.target.value)}
        className={cn(
          "h-9 rounded-md border border-border-default bg-bg-base px-space-3 text-sm text-text-primary",
          "focus:outline-none focus:ring-2 focus:ring-border-strong focus:ring-offset-2 focus:ring-offset-bg-base"
        )}
        aria-label="Filter by category"
      >
        <option value="">All Categories</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      {/* Scope selector */}
      <div className="flex rounded-md border border-border-default" role="radiogroup" aria-label="Filter by scope">
        {SCOPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            role="radio"
            aria-checked={scope === opt.value}
            onClick={() => onScopeChange(opt.value)}
            className={cn(
              "px-space-3 py-space-1 text-xs font-medium transition-colors first:rounded-l-md last:rounded-r-md",
              scope === opt.value
                ? "bg-accent-primary text-white"
                : "bg-bg-base text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
