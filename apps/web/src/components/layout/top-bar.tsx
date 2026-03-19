"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useAtom, useSetAtom } from "jotai";
import { Bell, Search, ChevronDown, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { unreadCountAtom } from "@/stores/notifications";
import { themeAtom, type Theme } from "@/stores/theme";
import { commandPaletteOpenAtom } from "@/stores/command-palette";
import { NotificationPanel } from "@/components/notifications/notification-panel";
import { useNotificationUnreadCount } from "@/lib/api/hooks";

export function TopBar() {
  const [, setUnreadCount] = useAtom(unreadCountAtom);
  const [theme, setTheme] = useAtom(themeAtom);
  const setCommandPaletteOpen = useSetAtom(commandPaletteOpenAtom);
  const [notifOpen, setNotifOpen] = useState(false);

  // Fetch real unread count from API
  const { data: unreadData } = useNotificationUnreadCount();
  const unreadCount = unreadData?.count ?? 0;

  // Sync to jotai atom so other components can read it
  useEffect(() => {
    setUnreadCount(unreadCount);
  }, [unreadCount, setUnreadCount]);

  const toggleTheme = () => {
    setTheme((prev: Theme) => (prev === "dark" ? "light" : "dark"));
  };

  const toggleNotifications = useCallback(() => {
    setNotifOpen((prev) => !prev);
  }, []);

  const closeNotifications = useCallback(() => {
    setNotifOpen(false);
  }, []);

  return (
    <>
      <header
        className="flex h-14 shrink-0 items-center border-b border-border-subtle bg-bg-surface px-space-4"
        role="banner"
      >
        {/* Left: Logo */}
        <Link
          href="/dashboard"
          className="flex items-center gap-space-2 text-text-primary"
          aria-label="Mission Control home"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-primary text-sm font-bold text-white">
            MC
          </span>
          <span className="hidden text-sm font-semibold md:inline">
            Mission Control
          </span>
        </Link>

        {/* Center: Search — opens command palette */}
        <div className="mx-auto hidden w-full max-w-md md:block">
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className={cn(
              "flex w-full items-center gap-space-2 rounded-md border border-border-default bg-bg-base px-space-3 py-space-2 text-sm text-text-muted transition-colors",
              "hover:border-border-strong hover:text-text-secondary"
            )}
            aria-label="Search (Cmd+K)"
          >
            <Search size={16} aria-hidden="true" />
            <span className="flex-1 text-left">Search boards, agents, tasks...</span>
            <kbd className="hidden rounded border border-border-default px-1.5 py-0.5 font-mono text-xs text-text-muted lg:inline-block">
              <span className="text-xs">&#8984;</span>K
            </kbd>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-space-2">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? (
              <Sun size={18} aria-hidden="true" />
            ) : (
              <Moon size={18} aria-hidden="true" />
            )}
          </button>

          {/* Notifications */}
          <button
            onClick={toggleNotifications}
            className="relative flex h-9 w-9 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
            aria-expanded={notifOpen}
            aria-haspopup="dialog"
          >
            <Bell size={18} aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-critical px-1 font-mono text-[10px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {/* Org switcher placeholder */}
          <button
            className="flex items-center gap-space-1 rounded-md px-space-2 py-space-1 text-sm text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
            aria-label="Switch organization"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded bg-accent-muted text-xs font-bold text-accent-primary">
              O
            </span>
            <ChevronDown size={14} aria-hidden="true" />
          </button>

          {/* User menu placeholder */}
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-elevated text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
            aria-label="User menu"
          >
            U
          </button>
        </div>
      </header>

      {/* Notification slide-out panel */}
      <NotificationPanel open={notifOpen} onClose={closeNotifications} />
    </>
  );
}
