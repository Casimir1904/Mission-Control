import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-space-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-accent-primary text-white hover:bg-accent-hover",
        destructive:
          "bg-status-critical text-white hover:bg-status-critical/90",
        outline:
          "border border-border-default bg-transparent text-text-primary hover:bg-bg-elevated hover:border-border-strong",
        secondary:
          "bg-bg-elevated text-text-primary hover:bg-bg-overlay",
        ghost:
          "text-text-secondary hover:bg-bg-elevated hover:text-text-primary",
        link:
          "text-accent-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-space-4 py-space-2",
        sm: "h-8 px-space-3 text-xs",
        lg: "h-11 px-space-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
export type { ButtonProps };
