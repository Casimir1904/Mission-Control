"use client";

import { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string[]; description: string }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "General",
    shortcuts: [
      { keys: ["\u2318K"], description: "Open command palette" },
      { keys: ["?"], description: "Show keyboard shortcuts" },
    ],
  },
  {
    title: "Navigation (press g then...)",
    shortcuts: [
      { keys: ["g", "d"], description: "Go to Dashboard" },
      { keys: ["g", "b"], description: "Go to Boards" },
      { keys: ["g", "a"], description: "Go to Agents" },
      { keys: ["g", "t"], description: "Go to Tasks" },
      { keys: ["g", "g"], description: "Go to Gateways" },
      { keys: ["g", "m"], description: "Go to Memory" },
      { keys: ["g", "s"], description: "Go to Settings" },
    ],
  },
];

export function KeyboardShortcutsHelp({
  registerToggle,
}: {
  registerToggle: (fn: () => void) => void;
}) {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    registerToggle(toggle);
  }, [registerToggle, toggle]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-dialog-overlay-show"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="absolute left-1/2 top-1/2 z-10 w-full max-w-md -translate-x-1/2 -translate-y-1/2 animate-fade-in-scale">
        <div className="rounded-lg border border-border-subtle bg-bg-overlay p-space-6 shadow-2xl">
          <div className="mb-space-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">
              Keyboard Shortcuts
            </h2>
            <button
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-secondary"
              aria-label="Close"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          <div className="space-y-space-5">
            {SHORTCUT_GROUPS.map((group) => (
              <div key={group.title}>
                <h3 className="mb-space-2 text-xs font-medium uppercase tracking-wider text-text-muted">
                  {group.title}
                </h3>
                <div className="space-y-space-1">
                  {group.shortcuts.map((shortcut) => (
                    <div
                      key={shortcut.description}
                      className="flex items-center justify-between py-space-1"
                    >
                      <span className="text-sm text-text-secondary">
                        {shortcut.description}
                      </span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, i) => (
                          <span key={i}>
                            {i > 0 && (
                              <span className="mx-0.5 text-xs text-text-muted">
                                then
                              </span>
                            )}
                            <kbd
                              className={cn(
                                "inline-flex min-w-[24px] items-center justify-center rounded border border-border-default px-1.5 py-0.5 font-mono text-xs text-text-secondary"
                              )}
                            >
                              {key}
                            </kbd>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
