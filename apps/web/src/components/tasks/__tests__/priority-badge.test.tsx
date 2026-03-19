import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PriorityBadge } from "../priority-badge";
import type { TaskPriority } from "@/lib/api/types";

const ALL_PRIORITIES: TaskPriority[] = ["low", "medium", "high", "critical"];

const EXPECTED_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

describe("PriorityBadge", () => {
  it.each(ALL_PRIORITIES)(
    "renders correct label for %s priority",
    (priority) => {
      render(<PriorityBadge priority={priority} />);
      expect(screen.getByText(EXPECTED_LABELS[priority])).toBeInTheDocument();
    }
  );

  it("shows warning icon for critical priority", () => {
    const { container } = render(<PriorityBadge priority="critical" />);
    // lucide-react renders an SVG with aria-hidden for the AlertTriangle icon
    const icon = container.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });

  it("does not show warning icon for low priority", () => {
    const { container } = render(<PriorityBadge priority="low" />);
    const icon = container.querySelector("svg");
    expect(icon).not.toBeInTheDocument();
  });

  it("does not show warning icon for medium priority", () => {
    const { container } = render(<PriorityBadge priority="medium" />);
    const icon = container.querySelector("svg");
    expect(icon).not.toBeInTheDocument();
  });

  it("does not show warning icon for high priority", () => {
    const { container } = render(<PriorityBadge priority="high" />);
    const icon = container.querySelector("svg");
    expect(icon).not.toBeInTheDocument();
  });

  it("applies neutral color classes for low priority", () => {
    const { container } = render(<PriorityBadge priority="low" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("text-status-neutral");
  });

  it("applies info color classes for medium priority", () => {
    const { container } = render(<PriorityBadge priority="medium" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("text-status-info");
  });

  it("applies warning color classes for high priority", () => {
    const { container } = render(<PriorityBadge priority="high" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("text-status-warning");
  });

  it("applies critical color classes for critical priority", () => {
    const { container } = render(<PriorityBadge priority="critical" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("text-status-critical");
    expect(badge.className).toContain("bg-status-critical");
  });

  it("merges custom className", () => {
    const { container } = render(
      <PriorityBadge priority="high" className="extra-class" />
    );
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass("extra-class");
  });
});
