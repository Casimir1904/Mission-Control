"use client";

import type { ReactNode } from "react";
import { Provider as JotaiProvider } from "jotai";
import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";
import { WebSocketProvider } from "./websocket-provider";
import { ToastProvider } from "@/components/ui/toast";
import { CommandPaletteProvider } from "@/components/command-palette/command-palette-provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <JotaiProvider>
      <QueryProvider>
        <ThemeProvider>
          <WebSocketProvider>
            <ToastProvider>
              <CommandPaletteProvider>{children}</CommandPaletteProvider>
            </ToastProvider>
          </WebSocketProvider>
        </ThemeProvider>
      </QueryProvider>
    </JotaiProvider>
  );
}
