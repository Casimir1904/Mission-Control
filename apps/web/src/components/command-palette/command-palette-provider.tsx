"use client";

import type { ReactNode } from "react";
import { CommandPalette } from "./command-palette";
import { KeyboardShortcutsHelp } from "./keyboard-shortcuts-help";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const { registerHelpToggle } = useKeyboardShortcuts();

  return (
    <>
      {children}
      <CommandPalette />
      <KeyboardShortcutsHelp registerToggle={registerHelpToggle} />
    </>
  );
}
