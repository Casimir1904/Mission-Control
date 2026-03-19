"use client";

import { useAtom } from "jotai";
import { useEffect, type ReactNode } from "react";
import { themeAtom } from "@/stores/theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme] = useAtom(themeAtom);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(theme);
  }, [theme]);

  return <>{children}</>;
}
