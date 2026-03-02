import type { ReactNode } from "react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";

type QuickAction = {
  label: string;
  href: string;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  icon?: ReactNode;
};

type TableLoadingRowProps = {
  colSpan: number;
  label?: string;
};

export function TableLoadingRow({
  colSpan,
  label = "Loading…",
}: TableLoadingRowProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-8">
        <span className="text-sm text-slate-500">{label}</span>
      </td>
    </tr>
  );
}

type TableEmptyStateRowProps = {
  colSpan: number;
  icon: ReactNode;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
};

export function TableEmptyStateRow({
  colSpan,
  icon,
  title,
  description,
  actionHref,
  actionLabel,
}: TableEmptyStateRowProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-16">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="mb-4 rounded-full bg-slate-50 p-4">{icon}</div>
          <h3 className="mb-2 text-lg font-semibold text-slate-900">{title}</h3>
          <p className="mb-6 max-w-md text-sm text-slate-500">{description}</p>
          {actionHref && actionLabel ? (
            <Link
              href={actionHref}
              className={buttonVariants({ size: "md", variant: "primary" })}
            >
              {actionLabel}
            </Link>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

type EnhancedEmptyStateRowProps = {
  colSpan: number;
  icon: ReactNode;
  title: string;
  description: string;
  quickActions: QuickAction[];
  learnMoreHref?: string;
};

export function EnhancedEmptyStateRow({
  colSpan,
  icon,
  title,
  description,
  quickActions,
  learnMoreHref,
}: EnhancedEmptyStateRowProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-16">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="mb-4 rounded-full bg-slate-50 p-4">{icon}</div>
          <h3 className="mb-2 text-lg font-semibold text-slate-900">{title}</h3>
          <p className="mb-6 max-w-md text-sm text-slate-500">{description}</p>

          {quickActions.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              {quickActions.map((action, index) => (
                <Link
                  key={index}
                  href={action.href}
                  className={buttonVariants({
                    size: "md",
                    variant: action.variant ?? "primary",
                  })}
                >
                  {action.icon && (
                    <span className="inline-flex items-center gap-2">
                      {action.icon}
                      {action.label}
                    </span>
                  )}
                  {!action.icon && action.label}
                </Link>
              ))}
            </div>
          )}

          {learnMoreHref && (
            <div className="mt-4">
              <Link
                href={learnMoreHref}
                className="text-sm text-slate-500 underline underline-offset-2 hover:text-slate-700"
              >
                Learn more
              </Link>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
