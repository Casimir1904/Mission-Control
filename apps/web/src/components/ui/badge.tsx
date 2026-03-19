import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-space-2 py-0.5 font-mono text-xs font-medium tabular-nums transition-colors",
  {
    variants: {
      variant: {
        default: "border border-border-default bg-bg-elevated text-text-secondary",
        healthy: "border border-status-healthy/30 bg-status-healthy/10 text-status-healthy",
        warning: "border border-status-warning/30 bg-status-warning/10 text-status-warning",
        critical: "border border-status-critical/30 bg-status-critical/10 text-status-critical",
        info: "border border-status-info/30 bg-status-info/10 text-status-info",
        neutral: "border border-status-neutral/30 bg-status-neutral/10 text-status-neutral",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
export type { BadgeProps };
