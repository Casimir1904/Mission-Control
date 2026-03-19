import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusDot } from "../status-dot";

type StatusVariant = "healthy" | "warning" | "critical" | "info" | "neutral";

const ALL_VARIANTS: StatusVariant[] = [
  "healthy",
  "warning",
  "critical",
  "info",
  "neutral",
];

const EXPECTED_COLORS: Record<StatusVariant, string> = {
  healthy: "bg-status-healthy",
  warning: "bg-status-warning",
  critical: "bg-status-critical",
  info: "bg-status-info",
  neutral: "bg-status-neutral",
};

describe("StatusDot", () => {
  it.each(ALL_VARIANTS)(
    "renders with correct color class for %s variant",
    (variant) => {
      const { container } = render(<StatusDot variant={variant} />);
      const dot = container.firstChild as HTMLElement;
      expect(dot).toHaveClass(EXPECTED_COLORS[variant]);
    }
  );

  it("renders with default size (h-2 w-2)", () => {
    const { container } = render(<StatusDot variant="healthy" />);
    const dot = container.firstChild as HTMLElement;
    expect(dot).toHaveClass("h-2");
    expect(dot).toHaveClass("w-2");
  });

  it("renders with small size (h-1.5 w-1.5)", () => {
    const { container } = render(<StatusDot variant="healthy" size="sm" />);
    const dot = container.firstChild as HTMLElement;
    expect(dot).toHaveClass("h-1.5");
    expect(dot).toHaveClass("w-1.5");
  });

  it("has role=img for accessibility", () => {
    render(<StatusDot variant="healthy" />);
    const dot = screen.getByRole("img");
    expect(dot).toBeInTheDocument();
  });

  it("sets default aria-label based on variant", () => {
    render(<StatusDot variant="critical" />);
    const dot = screen.getByRole("img");
    expect(dot).toHaveAttribute("aria-label", "Status: critical");
  });

  it("uses custom label for aria-label when provided", () => {
    render(<StatusDot variant="healthy" label="Agent online" />);
    const dot = screen.getByRole("img");
    expect(dot).toHaveAttribute("aria-label", "Agent online");
  });

  it("is always a rounded-full span", () => {
    const { container } = render(<StatusDot variant="info" />);
    const dot = container.firstChild as HTMLElement;
    expect(dot.tagName.toLowerCase()).toBe("span");
    expect(dot).toHaveClass("rounded-full");
  });

  it("merges custom className", () => {
    const { container } = render(
      <StatusDot variant="warning" className="ml-2" />
    );
    const dot = container.firstChild as HTMLElement;
    expect(dot).toHaveClass("ml-2");
    // Should still have variant color
    expect(dot).toHaveClass("bg-status-warning");
  });
});
