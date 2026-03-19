"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MemoryEditorProps {
  initialContent?: string;
  initialCategory?: string;
  initialImportance?: number;
  initialScope?: "agent" | "board" | "group";
  onSave: (data: {
    content: string;
    category: string;
    importance: number;
    scope: "agent" | "board" | "group";
  }) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function MemoryEditor({
  initialContent = "",
  initialCategory = "",
  initialImportance = 50,
  initialScope = "board",
  onSave,
  onCancel,
  isSaving = false,
}: MemoryEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [category, setCategory] = useState(initialCategory);
  const [importance, setImportance] = useState(initialImportance);
  const [scope, setScope] = useState<"agent" | "board" | "group">(initialScope);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onSave({ content, category, importance, scope });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-space-3">
      {/* Content */}
      <div>
        <label
          htmlFor="memory-content"
          className="mb-space-1 block text-xs font-medium text-text-secondary"
        >
          Content
        </label>
        <textarea
          id="memory-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          required
          className={cn(
            "w-full resize-y rounded-md border border-border-default bg-bg-base px-space-3 py-space-2 text-sm text-text-primary placeholder:text-text-muted",
            "focus:outline-none focus:ring-2 focus:ring-border-strong focus:ring-offset-2 focus:ring-offset-bg-base"
          )}
          placeholder="Enter memory content..."
        />
      </div>

      {/* Category + Scope row */}
      <div className="flex gap-space-3">
        <div className="flex-1">
          <label
            htmlFor="memory-category"
            className="mb-space-1 block text-xs font-medium text-text-secondary"
          >
            Category
          </label>
          <input
            id="memory-category"
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={cn(
              "h-9 w-full rounded-md border border-border-default bg-bg-base px-space-3 text-sm text-text-primary placeholder:text-text-muted",
              "focus:outline-none focus:ring-2 focus:ring-border-strong focus:ring-offset-2 focus:ring-offset-bg-base"
            )}
            placeholder="e.g. analysis, preference"
          />
        </div>

        <div className="w-32">
          <label
            htmlFor="memory-scope"
            className="mb-space-1 block text-xs font-medium text-text-secondary"
          >
            Scope
          </label>
          <select
            id="memory-scope"
            value={scope}
            onChange={(e) => setScope(e.target.value as "agent" | "board" | "group")}
            className={cn(
              "h-9 w-full rounded-md border border-border-default bg-bg-base px-space-3 text-sm text-text-primary",
              "focus:outline-none focus:ring-2 focus:ring-border-strong focus:ring-offset-2 focus:ring-offset-bg-base"
            )}
          >
            <option value="agent">Agent</option>
            <option value="board">Board</option>
            <option value="group">Group</option>
          </select>
        </div>
      </div>

      {/* Importance slider */}
      <div>
        <label
          htmlFor="memory-importance"
          className="mb-space-1 flex items-center justify-between text-xs font-medium text-text-secondary"
        >
          <span>Importance</span>
          <span className="font-mono tabular-nums text-text-muted">
            {importance}%
          </span>
        </label>
        <input
          id="memory-importance"
          type="range"
          min={0}
          max={100}
          step={1}
          value={importance}
          onChange={(e) => setImportance(Number(e.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-bg-elevated accent-accent-primary"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-space-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isSaving || !content.trim()}>
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}
