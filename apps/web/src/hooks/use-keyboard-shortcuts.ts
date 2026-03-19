"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSetAtom } from "jotai";
import { useRouter } from "next/navigation";
import { commandPaletteOpenAtom } from "@/stores/command-palette";

/**
 * Global keyboard shortcut handler.
 *
 * Shortcuts:
 *  - Cmd+K / Ctrl+K  -> open command palette
 *  - g d             -> go to dashboard (vim-style sequence within 500ms)
 *  - g b             -> go to boards
 *  - g a             -> go to agents
 *  - g t             -> go to tasks
 *  - g g             -> go to gateways
 *  - ?               -> show keyboard shortcuts help overlay
 */
export function useKeyboardShortcuts() {
  const router = useRouter();
  const setCommandPaletteOpen = useSetAtom(commandPaletteOpenAtom);
  const pendingKeyRef = useRef<string | null>(null);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showHelpRef = useRef<(() => void) | null>(null);

  // Expose a way for the shortcuts help overlay to register itself
  const registerHelpToggle = useCallback((fn: () => void) => {
    showHelpRef.current = fn;
  }, []);

  useEffect(() => {
    function isInputFocused() {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return true;
      if ((el as HTMLElement).isContentEditable) return true;
      return false;
    }

    function handleKeyDown(e: KeyboardEvent) {
      // Cmd+K / Ctrl+K always works, even in inputs
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
        return;
      }

      // All other shortcuts are disabled when an input is focused
      if (isInputFocused()) return;

      // "?" for help overlay
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        showHelpRef.current?.();
        return;
      }

      // Vim-style "g" prefix shortcuts
      if (e.key === "g" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (pendingKeyRef.current === null) {
          // First key in sequence
          pendingKeyRef.current = "g";
          pendingTimerRef.current = setTimeout(() => {
            pendingKeyRef.current = null;
          }, 500);
          return;
        }
      }

      // Second key after "g"
      if (pendingKeyRef.current === "g") {
        pendingKeyRef.current = null;
        if (pendingTimerRef.current) {
          clearTimeout(pendingTimerRef.current);
          pendingTimerRef.current = null;
        }

        const routes: Record<string, string> = {
          d: "/dashboard",
          b: "/boards",
          a: "/agents",
          t: "/tasks",
          g: "/gateways",
          m: "/memory",
          s: "/settings",
        };

        const route = routes[e.key];
        if (route) {
          e.preventDefault();
          router.push(route as never);
          return;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (pendingTimerRef.current) {
        clearTimeout(pendingTimerRef.current);
      }
    };
  }, [router, setCommandPaletteOpen]);

  return { registerHelpToggle };
}
