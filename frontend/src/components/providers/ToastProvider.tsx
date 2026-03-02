"use client";

import type { ReactNode } from "react";

import { Toaster } from "sonner";

export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "var(--color-surface)",
            color: "var(--color-strong)",
            border: "1px solid var(--color-border)",
          },
        }}
      />
    </>
  );
}
