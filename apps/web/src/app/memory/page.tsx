"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Brain, Plus, Search } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/status/empty-state";
import { Button } from "@/components/ui/button";
import { MemoryList } from "@/components/memory/memory-list";
import { MemoryFilters } from "@/components/memory/memory-filters";
import { MemoryEditor } from "@/components/memory/memory-editor";
import { useMemory, useBoards, useCreateMemory } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";

export default function MemoryPage() {
  const [boardId, setBoardId] = useState("");
  const [category, setCategory] = useState("");
  const [scope, setScope] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: boards } = useBoards();
  const firstBoardId = boards?.items?.[0]?.id ?? "";

  // Use first board as default when no filter is set
  const activeBoardId = boardId || firstBoardId;

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const params = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      category: category || undefined,
      scope: (scope || undefined) as "agent" | "board" | "group" | undefined,
    }),
    [debouncedSearch, category, scope]
  );

  const { data, isLoading } = useMemory(activeBoardId, params);
  const createMemory = useCreateMemory();

  const entries = data?.items ?? [];

  // Collect unique categories from data for filter dropdown
  const categories = useMemo(() => {
    const cats = new Set<string>();
    entries.forEach((e) => {
      if (e.category) cats.add(e.category);
    });
    return Array.from(cats).sort();
  }, [entries]);

  const handleCreate = useCallback(
    (formData: {
      content: string;
      category: string;
      importance: number;
      scope: "agent" | "board" | "group";
    }) => {
      createMemory.mutate(
        {
          boardId: activeBoardId,
          data: {
            board_id: activeBoardId,
            content: formData.content,
            category: formData.category,
            importance: formData.importance / 100,
            scope: formData.scope,
          },
        },
        { onSuccess: () => setCreating(false) }
      );
    },
    [activeBoardId, createMemory]
  );

  const showEmpty = !isLoading && entries.length === 0 && !creating && !debouncedSearch;

  return (
    <DashboardShell>
      <PageHeader
        title="Memory Explorer"
        description="Shared knowledge and context across boards and agents"
        action={
          !creating && !showEmpty ? (
            <Button onClick={() => setCreating(true)}>
              <Plus size={16} aria-hidden="true" />
              Add Memory
            </Button>
          ) : undefined
        }
      />

      {showEmpty ? (
        <EmptyState
          icon={Brain}
          title="No memory entries"
          description="Memory stores shared context that agents use to coordinate. As agents work, they build collective knowledge here."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus size={16} aria-hidden="true" />
              Add Memory Entry
            </Button>
          }
        />
      ) : (
        <div className="space-y-space-4">
          {/* Search bar */}
          <div className="relative">
            <Search
              size={16}
              className="absolute left-space-3 top-1/2 -translate-y-1/2 text-text-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search memory entries..."
              className={cn(
                "h-9 w-full rounded-md border border-border-default bg-bg-base pl-9 pr-space-3 text-sm text-text-primary placeholder:text-text-muted",
                "focus:outline-none focus:ring-2 focus:ring-border-strong focus:ring-offset-2 focus:ring-offset-bg-base"
              )}
              aria-label="Search memory entries"
            />
          </div>

          {/* Filters */}
          <MemoryFilters
            boardId={boardId}
            onBoardChange={setBoardId}
            category={category}
            onCategoryChange={setCategory}
            scope={scope}
            onScopeChange={setScope}
            categories={categories}
          />

          {/* Create form */}
          {creating && (
            <div className="rounded-md border border-border-subtle bg-bg-surface p-space-4">
              <h3 className="mb-space-3 text-sm font-semibold text-text-primary">
                New Memory Entry
              </h3>
              <MemoryEditor
                onSave={handleCreate}
                onCancel={() => setCreating(false)}
                isSaving={createMemory.isPending}
              />
            </div>
          )}

          {/* Memory list */}
          <MemoryList entries={entries} isLoading={isLoading} />

          {/* No results for search */}
          {!isLoading && entries.length === 0 && debouncedSearch && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-text-secondary">
                No results for &ldquo;{debouncedSearch}&rdquo;
              </p>
              <p className="mt-space-1 text-xs text-text-muted">
                Try a different search term or adjust filters.
              </p>
            </div>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
