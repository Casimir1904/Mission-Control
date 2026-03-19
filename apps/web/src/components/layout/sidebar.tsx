"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAtom } from "jotai";
import {
  LayoutDashboard,
  CalendarDays,
  Kanban,
  Bot,
  ListTodo,
  ShieldCheck,
  Brain,
  Activity,
  DollarSign,
  Radio,
  Webhook,
  Network,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { sidebarCollapsedAtom } from "@/stores/sidebar";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  count?: number;
  attention?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Boards", href: "/boards", icon: Kanban },
      { label: "Agents", href: "/agents", icon: Bot },
      { label: "Tasks", href: "/tasks", icon: ListTodo },
      { label: "Approvals", href: "/approvals", icon: ShieldCheck },
      { label: "Calendar", href: "/calendar", icon: CalendarDays },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { label: "Memory", href: "/memory", icon: Brain },
      { label: "Traces", href: "/traces", icon: Activity },
      { label: "Costs", href: "/costs", icon: DollarSign },
    ],
  },
  {
    title: "Infrastructure",
    items: [
      { label: "Gateways", href: "/gateways", icon: Radio },
      { label: "Webhooks", href: "/webhooks", icon: Webhook },
      { label: "Topology", href: "/topology", icon: Network },
    ],
  },
];

function NavItemLink({
  item,
  collapsed,
  isActive,
}: {
  item: NavItem;
  collapsed: boolean;
  isActive: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href as never}
      className={cn(
        "group relative flex items-center gap-space-3 rounded-md px-space-3 py-space-2 text-sm transition-colors duration-200",
        "text-text-secondary hover:bg-bg-elevated hover:text-text-primary",
        "min-h-[44px]", // touch-target accessibility
        isActive && "bg-bg-elevated font-semibold text-text-primary",
        collapsed && "justify-center px-space-2"
      )}
      aria-current={isActive ? "page" : undefined}
      title={collapsed ? item.label : undefined}
    >
      {/* Active indicator — left accent border */}
      {isActive && (
        <span
          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent-primary"
          aria-hidden="true"
        />
      )}

      <Icon
        size={20}
        className={cn(
          "shrink-0 text-text-secondary transition-colors",
          isActive && "text-accent-primary",
          "group-hover:text-text-primary"
        )}
        aria-hidden="true"
      />

      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>

          {/* Attention dot */}
          {item.attention && (
            <span
              className="h-2 w-2 rounded-full bg-status-critical"
              aria-label="Needs attention"
            />
          )}

          {/* Live count badge */}
          {item.count !== undefined && (
            <span className="font-mono text-xs text-text-muted tabular-nums">
              {item.count}
            </span>
          )}
        </>
      )}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useAtom(sidebarCollapsedAtom);

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-border-subtle bg-bg-surface transition-[width] duration-200",
        collapsed ? "w-16" : "w-60"
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto px-space-2 py-space-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title || "top"} className="mb-space-4">
            {/* Section header */}
            {section.title && !collapsed && (
              <h3 className="mb-space-1 px-space-3 text-xs font-medium uppercase tracking-wider text-text-muted">
                {section.title}
              </h3>
            )}

            {/* Separator for collapsed sections */}
            {section.title && collapsed && (
              <div className="mx-auto mb-space-2 h-px w-6 bg-border-subtle" />
            )}

            <ul className="space-y-0.5" role="list">
              {section.items.map((item) => (
                <li key={item.href}>
                  <NavItemLink
                    item={item}
                    collapsed={collapsed}
                    isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom section: Settings + Collapse toggle */}
      <div className="border-t border-border-subtle px-space-2 py-space-3">
        <NavItemLink
          item={{ label: "Settings", href: "/settings", icon: Settings }}
          collapsed={collapsed}
          isActive={pathname === "/settings" || pathname.startsWith("/settings/")}
        />

        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "mt-space-2 flex w-full items-center gap-space-3 rounded-md px-space-3 py-space-2 text-sm text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-secondary",
            "min-h-[44px]",
            collapsed && "justify-center px-space-2"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen size={20} aria-hidden="true" />
          ) : (
            <>
              <PanelLeftClose size={20} aria-hidden="true" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
