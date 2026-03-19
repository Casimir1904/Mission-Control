import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge, getStatusLabel, KANBAN_STATUSES } from "../status-badge";
import type { TaskStatus } from "@/lib/api/types";

const ALL_STATUSES: TaskStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "review",
  "approved",
  "rejected",
  "done",
  "blocked",
];

const EXPECTED_LABELS: Record<TaskStatus, string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  review: "Review",
  approved: "Approved",
  rejected: "Rejected",
  done: "Done",
  blocked: "Blocked",
};

describe("StatusBadge", () => {
  it.each(ALL_STATUSES)("renders correct label for %s status", (status) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(EXPECTED_LABELS[status])).toBeInTheDocument();
  });

  it("renders a status dot indicator", () => {
    const { container } = render(<StatusBadge status="done" />);
    const dot = container.querySelector("[aria-hidden='true']");
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveClass("rounded-full");
  });

  it("applies healthy color classes for done status", () => {
    const { container } = render(<StatusBadge status="done" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("bg-status-healthy");
    expect(badge.className).toContain("text-status-healthy");
  });

  it("applies critical color classes for blocked status", () => {
    const { container } = render(<StatusBadge status="blocked" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("bg-status-critical");
    expect(badge.className).toContain("text-status-critical");
  });

  it("applies info color classes for todo status", () => {
    const { container } = render(<StatusBadge status="todo" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("bg-status-info");
    expect(badge.className).toContain("text-status-info");
  });

  it("applies accent color classes for in_progress status", () => {
    const { container } = render(<StatusBadge status="in_progress" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("text-accent-primary");
  });

  it("applies warning color classes for review status", () => {
    const { container } = render(<StatusBadge status="review" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("bg-status-warning");
    expect(badge.className).toContain("text-status-warning");
  });

  it("applies animate-pulse to in_progress dot", () => {
    const { container } = render(<StatusBadge status="in_progress" />);
    const dot = container.querySelector("[aria-hidden='true']");
    expect(dot).toHaveClass("animate-pulse");
  });

  it("applies dashed border to blocked status", () => {
    const { container } = render(<StatusBadge status="blocked" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("border-dashed");
  });

  it("merges custom className", () => {
    const { container } = render(
      <StatusBadge status="done" className="my-custom-class" />
    );
    const badge = container.firstChild as HTMLElement;
    expect(badge).toHaveClass("my-custom-class");
  });
});

describe("getStatusLabel", () => {
  it.each(ALL_STATUSES)(
    "returns correct human-readable label for %s",
    (status) => {
      expect(getStatusLabel(status)).toBe(EXPECTED_LABELS[status]);
    }
  );
});

describe("KANBAN_STATUSES", () => {
  it("contains ordered subset of statuses for Kanban columns", () => {
    expect(KANBAN_STATUSES).toEqual([
      "backlog",
      "todo",
      "in_progress",
      "review",
      "done",
    ]);
  });

  it("does not include blocked, approved, or rejected", () => {
    expect(KANBAN_STATUSES).not.toContain("blocked");
    expect(KANBAN_STATUSES).not.toContain("approved");
    expect(KANBAN_STATUSES).not.toContain("rejected");
  });
});
