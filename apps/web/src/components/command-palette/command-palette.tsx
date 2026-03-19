"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { useAtom } from "jotai";
import { useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Kanban,
  Bot,
  ListTodo,
  LayoutDashboard,
  Radio,
  Brain,
  Settings,
  Plus,
  ArrowRight,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { commandPaletteOpenAtom } from "@/stores/command-palette";
import { useDebounce } from "@/hooks/use-debounce";
import { useBoards, useAgents, useTasks, useGateways, queryKeys } from "@/lib/api/hooks";
import type { Board, Agent, Task } from "@/lib/api/types";
import { gatewaysApi } from "@/lib/api/client";

// ── Types ──

interface CommandItem {
  id: string;
  label: string;
  subtitle?: string;
  icon: LucideIcon;
  category: "action" | "board" | "agent" | "task" | "gateway";
  onSelect: () => void;
}

// ── Static actions ──

function useStaticActions(): CommandItem[] {
  const router = useRouter();

  return useMemo(
    () => [
      {
        id: "action:create-board",
        label: "Create Board",
        subtitle: "Create a new board",
        icon: Plus,
        category: "action" as const,
        onSelect: () => router.push("/boards/new"),
      },
      {
        id: "action:create-agent",
        label: "Create Agent",
        subtitle: "Add a new agent",
        icon: Plus,
        category: "action" as const,
        onSelect: () => router.push("/agents/new"),
      },
      {
        id: "action:create-task",
        label: "Create Task",
        subtitle: "Add a new task",
        icon: Plus,
        category: "action" as const,
        onSelect: () => router.push("/tasks/new"),
      },
      {
        id: "action:go-dashboard",
        label: "Go to Dashboard",
        icon: LayoutDashboard,
        category: "action" as const,
        onSelect: () => router.push("/dashboard"),
      },
      {
        id: "action:go-gateways",
        label: "Go to Gateways",
        icon: Radio,
        category: "action" as const,
        onSelect: () => router.push("/gateways"),
      },
      {
        id: "action:go-memory",
        label: "Go to Memory",
        icon: Brain,
        category: "action" as const,
        onSelect: () => router.push("/memory"),
      },
      {
        id: "action:go-settings",
        label: "Go to Settings",
        icon: Settings,
        category: "action" as const,
        onSelect: () => router.push("/settings"),
      },
    ],
    [router]
  );
}

// ── Category config ──

const CATEGORY_LABELS: Record<string, string> = {
  action: "Actions",
  board: "Boards",
  agent: "Agents",
  task: "Tasks",
  gateway: "Gateways",
};

const CATEGORY_ORDER = ["action", "board", "agent", "task", "gateway"];

// ── Main component ──

export function CommandPalette() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useAtom(commandPaletteOpenAtom);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 200);
  const staticActions = useStaticActions();

  // ── Data from TanStack Query cache (or fetch) ──
  const { data: boardsData } = useBoards({ per_page: 100 });
  const { data: agentsData } = useAgents({ per_page: 100 });
  const { data: tasksData } = useTasks({ per_page: 100 });
  const { data: gatewaysData } = useGateways();

  // ── Build search results ──
  const items = useMemo(() => {
    const lowerQuery = debouncedQuery.toLowerCase().trim();
    const results: CommandItem[] = [];

    // Filter static actions
    const filteredActions = lowerQuery
      ? staticActions.filter(
          (a) =>
            a.label.toLowerCase().includes(lowerQuery) ||
            a.subtitle?.toLowerCase().includes(lowerQuery)
        )
      : staticActions;

    results.push(...filteredActions);

    // ── Build gateway sync actions ──
    if (gatewaysData?.items) {
      for (const gw of gatewaysData.items) {
        if (
          !lowerQuery ||
          `sync ${gw.name}`.toLowerCase().includes(lowerQuery) ||
          "sync gateway".includes(lowerQuery)
        ) {
          results.push({
            id: `action:sync-gw-${gw.id}`,
            label: `Sync Gateway: ${gw.name}`,
            subtitle: gw.url,
            icon: RefreshCw,
            category: "action",
            onSelect: () => {
              gatewaysApi.sync(gw.id).then(() => {
                queryClient.invalidateQueries({ queryKey: queryKeys.gateways.all });
                queryClient.invalidateQueries({ queryKey: queryKeys.agents.all });
              });
            },
          });
        }
      }
    }

    // ── Boards ──
    if (boardsData?.items) {
      const filtered = lowerQuery
        ? boardsData.items.filter((b: Board) =>
            b.name.toLowerCase().includes(lowerQuery)
          )
        : boardsData.items.slice(0, 5);

      for (const board of filtered) {
        results.push({
          id: `board:${board.id}`,
          label: board.name,
          subtitle: `${board.agent_count} agents`,
          icon: Kanban,
          category: "board",
          onSelect: () => router.push(`/boards/${board.id}`),
        });
      }
    }

    // ── Agents ──
    if (agentsData?.items) {
      const filtered = lowerQuery
        ? agentsData.items.filter(
            (a: Agent) =>
              a.name.toLowerCase().includes(lowerQuery) ||
              a.role.toLowerCase().includes(lowerQuery)
          )
        : agentsData.items.slice(0, 5);

      for (const agent of filtered) {
        results.push({
          id: `agent:${agent.id}`,
          label: agent.name,
          subtitle: `${agent.role} ${agent.board_name ? `- ${agent.board_name}` : ""}`,
          icon: Bot,
          category: "agent",
          onSelect: () => router.push(`/agents/${agent.id}`),
        });
      }
    }

    // ── Tasks ──
    if (tasksData?.items) {
      const filtered = lowerQuery
        ? tasksData.items.filter((t: Task) =>
            t.title.toLowerCase().includes(lowerQuery)
          )
        : tasksData.items.slice(0, 5);

      for (const task of filtered) {
        results.push({
          id: `task:${task.id}`,
          label: task.title,
          subtitle: `${task.status} ${task.board_name ? `- ${task.board_name}` : ""}`,
          icon: ListTodo,
          category: "task",
          onSelect: () => router.push(`/boards/${task.board_id}?task=${task.id}`),
        });
      }
    }

    return results;
  }, [
    debouncedQuery,
    staticActions,
    boardsData,
    agentsData,
    tasksData,
    gatewaysData,
    router,
    queryClient,
  ]);

  // ── Group items by category ──
  const groupedItems = useMemo(() => {
    const groups: { category: string; label: string; items: CommandItem[] }[] = [];
    for (const cat of CATEGORY_ORDER) {
      const catItems = items.filter((i) => i.category === cat);
      if (catItems.length > 0) {
        groups.push({
          category: cat,
          label: CATEGORY_LABELS[cat] ?? cat,
          items: catItems,
        });
      }
    }
    return groups;
  }, [items]);

  // ── Flat list for keyboard nav ──
  const flatItems = useMemo(
    () => groupedItems.flatMap((g) => g.items),
    [groupedItems]
  );

  // ── Reset selection when items change ──
  useEffect(() => {
    setSelectedIndex(0);
  }, [flatItems.length]);

  // ── Focus input on open ──
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      // Small delay so the DOM is ready
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [open]);

  // ── Close on Escape ──
  useEffect(() => {
    if (!open) return;
    function handleEscape(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, setOpen]);

  // ── Execute selected item ──
  const executeSelected = useCallback(() => {
    const item = flatItems[selectedIndex];
    if (item) {
      setOpen(false);
      item.onSelect();
    }
  }, [flatItems, selectedIndex, setOpen]);

  // ── Keyboard navigation in the list ──
  const handleInputKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, flatItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        executeSelected();
      }
    },
    [flatItems.length, executeSelected]
  );

  // ── Scroll selected item into view ──
  useEffect(() => {
    if (!listRef.current) return;
    const selectedEl = listRef.current.querySelector(
      `[data-index="${selectedIndex}"]`
    );
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (!open) return null;

  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Command palette">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-dialog-overlay-show"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Palette container */}
      <div className="absolute left-1/2 top-[20%] z-10 w-full max-w-[640px] -translate-x-1/2 animate-fade-in-scale">
        <div className="overflow-hidden rounded-lg border border-border-subtle bg-bg-overlay shadow-2xl">
          {/* Search input */}
          <div className="flex items-center gap-space-3 border-b border-border-subtle px-space-4 py-space-3">
            <Search size={20} className="shrink-0 text-text-muted" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Search boards, agents, tasks, or type a command..."
              className="flex-1 bg-transparent text-lg text-text-primary placeholder:text-text-muted outline-none"
              aria-label="Search commands"
              aria-activedescendant={
                flatItems[selectedIndex]
                  ? `cmd-item-${flatItems[selectedIndex].id}`
                  : undefined
              }
              role="combobox"
              aria-expanded="true"
              aria-controls="command-palette-list"
              aria-autocomplete="list"
            />
            <kbd className="rounded border border-border-default px-1.5 py-0.5 font-mono text-xs text-text-muted">
              esc
            </kbd>
          </div>

          {/* Results list */}
          <div
            ref={listRef}
            id="command-palette-list"
            className="max-h-[400px] overflow-y-auto py-space-2"
            role="listbox"
          >
            {flatItems.length === 0 && (
              <div className="px-space-4 py-space-8 text-center text-sm text-text-muted">
                No results found for &ldquo;{query}&rdquo;
              </div>
            )}

            {groupedItems.map((group) => (
              <div key={group.category}>
                {/* Category header */}
                <div className="px-space-4 pb-space-1 pt-space-2 text-xs font-medium uppercase tracking-wider text-text-muted">
                  {group.label}
                </div>

                {group.items.map((item) => {
                  flatIndex++;
                  const idx = flatIndex;
                  const isSelected = idx === selectedIndex;
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      id={`cmd-item-${item.id}`}
                      data-index={idx}
                      role="option"
                      aria-selected={isSelected}
                      className={cn(
                        "flex w-full items-center gap-space-3 px-space-4 py-space-2 text-left text-sm transition-colors",
                        isSelected
                          ? "bg-bg-elevated text-text-primary"
                          : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
                      )}
                      onClick={() => {
                        setOpen(false);
                        item.onSelect();
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                    >
                      <Icon
                        size={16}
                        className={cn(
                          "shrink-0",
                          isSelected ? "text-accent-primary" : "text-text-muted"
                        )}
                        aria-hidden="true"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium">{item.label}</div>
                        {item.subtitle && (
                          <div className="truncate text-xs text-text-muted">
                            {item.subtitle}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <ArrowRight size={14} className="shrink-0 text-text-muted" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Footer hints */}
          <div className="flex items-center gap-space-4 border-t border-border-subtle px-space-4 py-space-2 text-xs text-text-muted">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border-default px-1 py-0.5 font-mono text-[10px]">&uarr;</kbd>
              <kbd className="rounded border border-border-default px-1 py-0.5 font-mono text-[10px]">&darr;</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border-default px-1 py-0.5 font-mono text-[10px]">&crarr;</kbd>
              select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border-default px-1 py-0.5 font-mono text-[10px]">esc</kbd>
              close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
