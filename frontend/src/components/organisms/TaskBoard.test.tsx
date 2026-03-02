import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TaskBoard } from "./TaskBoard";

describe("TaskBoard", () => {
  it("uses a mobile-first stacked layout (no horizontal scroll) with responsive kanban columns on larger screens", () => {
    render(
      <TaskBoard
        tasks={[
          {
            id: "t1",
            title: "Inbox item",
            status: "inbox",
            priority: "medium",
          },
        ]}
      />,
    );

    const board = screen.getByTestId("task-board");

    expect(board.className).toContain("overflow-x-hidden");
    expect(board.className).toContain("sm:overflow-x-auto");
    expect(board.className).toContain("grid-cols-1");
    expect(board.className).toContain("sm:grid-flow-col");
  });

  it("only sticks column headers on larger screens (avoids weird stacked sticky headers on mobile)", () => {
    render(
      <TaskBoard
        tasks={[
          {
            id: "t1",
            title: "Inbox item",
            status: "inbox",
            priority: "medium",
          },
        ]}
      />,
    );

    const header = screen
      .getByRole("heading", { name: "Inbox" })
      .closest(".column-header");
    expect(header?.className).toContain("sm:sticky");
    expect(header?.className).toContain("sm:top-0");
    // Ensure we didn't accidentally keep unscoped sticky behavior.
    expect(header?.className).not.toContain("sticky top-0");
  });

  describe("keyboard navigation", () => {
    it("focuses the first task when ArrowDown is pressed on the board", () => {
      render(
        <TaskBoard
          tasks={[
            { id: "t1", title: "First task", status: "inbox", priority: "high" },
            { id: "t2", title: "Second task", status: "inbox", priority: "medium" },
          ]}
        />,
      );

      const board = screen.getByTestId("task-board");
      fireEvent.keyDown(board, { key: "ArrowDown" });

      // After navigation, the first card should have keyboard focus styles
      const firstCard = screen.getByRole("button", { name: /First task/i });
      expect(firstCard.className).toContain("ring-");
    });

    it("navigates to next task with ArrowDown", () => {
      render(
        <TaskBoard
          tasks={[
            { id: "t1", title: "First task", status: "inbox", priority: "high" },
            { id: "t2", title: "Second task", status: "inbox", priority: "medium" },
          ]}
        />,
      );

      const board = screen.getByTestId("task-board");
      fireEvent.keyDown(board, { key: "ArrowDown" });
      fireEvent.keyDown(board, { key: "ArrowDown" });

      // Second card should have focus styles (ring-2 ring-[color:var(--accent)])
      const secondCard = screen.getByRole("button", { name: /Second task/i });
      expect(secondCard.className).toContain("ring-2");
      expect(secondCard.className).toContain("ring-offset-2");
      // First card should only have focus-visible styles, not ring-2
      const firstCard = screen.getByRole("button", { name: /First task/i });
      expect(firstCard.className).not.toContain("ring-2 ring-[color:var(--accent)]");
    });

    it("navigates to previous task with ArrowUp", () => {
      render(
        <TaskBoard
          tasks={[
            { id: "t1", title: "First task", status: "inbox", priority: "high" },
            { id: "t2", title: "Second task", status: "inbox", priority: "medium" },
          ]}
        />,
      );

      const board = screen.getByTestId("task-board");
      fireEvent.keyDown(board, { key: "ArrowDown" });
      fireEvent.keyDown(board, { key: "ArrowDown" });
      fireEvent.keyDown(board, { key: "ArrowUp" });

      // First card should have focus styles
      const firstCard = screen.getByRole("button", { name: /First task/i });
      expect(firstCard.className).toContain("ring-");
    });

    it("wraps from last task to first with ArrowDown", () => {
      render(
        <TaskBoard
          tasks={[
            { id: "t1", title: "First task", status: "inbox", priority: "high" },
            { id: "t2", title: "Second task", status: "inbox", priority: "medium" },
          ]}
        />,
      );

      const board = screen.getByTestId("task-board");
      fireEvent.keyDown(board, { key: "ArrowDown" });
      fireEvent.keyDown(board, { key: "ArrowDown" });
      fireEvent.keyDown(board, { key: "ArrowDown" });

      // Should wrap back to first card
      const firstCard = screen.getByRole("button", { name: /First task/i });
      expect(firstCard.className).toContain("ring-");
    });

    it("wraps from first task to last with ArrowUp", () => {
      render(
        <TaskBoard
          tasks={[
            { id: "t1", title: "First task", status: "inbox", priority: "high" },
            { id: "t2", title: "Second task", status: "inbox", priority: "medium" },
          ]}
        />,
      );

      const board = screen.getByTestId("task-board");
      fireEvent.keyDown(board, { key: "ArrowDown" });
      fireEvent.keyDown(board, { key: "ArrowUp" });

      // Should wrap to second card
      const secondCard = screen.getByRole("button", { name: /Second task/i });
      expect(secondCard.className).toContain("ring-");
    });

    it("also navigates with ArrowRight/ArrowLeft like Down/Up in normal mode", () => {
      render(
        <TaskBoard
          tasks={[
            { id: "t1", title: "First task", status: "inbox", priority: "high" },
            { id: "t2", title: "Second task", status: "inbox", priority: "medium" },
          ]}
        />,
      );

      const board = screen.getByTestId("task-board");
      fireEvent.keyDown(board, { key: "ArrowRight" });
      fireEvent.keyDown(board, { key: "ArrowRight" });

      const secondCard = screen.getByRole("button", { name: /Second task/i });
      expect(secondCard.className).toContain("ring-");

      fireEvent.keyDown(board, { key: "ArrowLeft" });

      const firstCard = screen.getByRole("button", { name: /First task/i });
      expect(firstCard.className).toContain("ring-");
    });

    it("navigates across columns with arrow keys", () => {
      render(
        <TaskBoard
          tasks={[
            { id: "t1", title: "Inbox task", status: "inbox", priority: "high" },
            { id: "t2", title: "In Progress task", status: "in_progress", priority: "medium" },
          ]}
        />,
      );

      const board = screen.getByTestId("task-board");
      fireEvent.keyDown(board, { key: "ArrowDown" });

      const inboxCard = screen.getByRole("button", { name: /Inbox task/i });
      expect(inboxCard.className).toContain("ring-");

      fireEvent.keyDown(board, { key: "ArrowDown" });

      const inProgressCard = screen.getByRole("button", { name: /In Progress task/i });
      expect(inProgressCard.className).toContain("ring-");
    });
  });

  describe("keyboard move mode", () => {
    it("activates move mode when Enter is pressed on focused task", () => {
      render(
        <TaskBoard
          tasks={[
            { id: "t1", title: "Task to move", status: "inbox", priority: "high" },
          ]}
        />,
      );

      const board = screen.getByTestId("task-board");
      fireEvent.keyDown(board, { key: "ArrowDown" });
      fireEvent.keyDown(board, { key: "Enter" });

      // When move mode is active, the aria-label changes to include move instructions
      const taskCard = screen.getByRole("button", { name: /Moving to inbox/i });
      expect(taskCard.className).toContain("ring-indigo-500");
    });

    it("activates move mode when Space is pressed on focused task", () => {
      render(
        <TaskBoard
          tasks={[
            { id: "t1", title: "Task to move", status: "inbox", priority: "high" },
          ]}
        />,
      );

      const board = screen.getByTestId("task-board");
      fireEvent.keyDown(board, { key: "ArrowDown" });
      fireEvent.keyDown(board, { key: " " });

      // When move mode is active, the aria-label changes to include move instructions
      const taskCard = screen.getByRole("button", { name: /Moving to inbox/i });
      expect(taskCard.className).toContain("ring-indigo-500");
    });

    it("cancels move mode when Escape is pressed", () => {
      render(
        <TaskBoard
          tasks={[
            { id: "t1", title: "Task to move", status: "inbox", priority: "high" },
          ]}
        />,
      );

      const board = screen.getByTestId("task-board");
      fireEvent.keyDown(board, { key: "ArrowDown" });
      fireEvent.keyDown(board, { key: "Enter" });

      // When move mode is active, the aria-label changes
      const taskCardInMoveMode = screen.getByRole("button", { name: /Moving to inbox/i });
      expect(taskCardInMoveMode.className).toContain("ring-indigo-500");

      fireEvent.keyDown(board, { key: "Escape" });

      // After canceling, the card should no longer have move mode styles
      // We need to find it by the title now since aria-label is gone
      const taskCardNormal = screen.getByRole("button", { name: /Task to move/i });
      expect(taskCardNormal.className).not.toContain("ring-indigo-500");
    });

    it("highlights target column when navigating in move mode", () => {
      render(
        <TaskBoard
          tasks={[
            { id: "t1", title: "Task to move", status: "inbox", priority: "high" },
          ]}
        />,
      );

      const board = screen.getByTestId("task-board");
      fireEvent.keyDown(board, { key: "ArrowDown" });
      fireEvent.keyDown(board, { key: "Enter" });

      // Navigate to next column
      fireEvent.keyDown(board, { key: "ArrowRight" });

      const inProgressColumn = screen.getByRole("list", { name: /In Progress column/i });
      expect(inProgressColumn.className).toContain("ring-indigo-400");
    });

    it("navigates to previous column with ArrowLeft in move mode", () => {
      render(
        <TaskBoard
          tasks={[
            { id: "t1", title: "Task to move", status: "in_progress", priority: "high" },
          ]}
        />,
      );

      const board = screen.getByTestId("task-board");
      fireEvent.keyDown(board, { key: "ArrowDown" });
      fireEvent.keyDown(board, { key: "Enter" });

      // Navigate to previous column (Inbox)
      fireEvent.keyDown(board, { key: "ArrowLeft" });

      const inboxColumn = screen.getByRole("list", { name: /Inbox column/i });
      expect(inboxColumn.className).toContain("ring-indigo-400");
    });

    it("calls onTaskMove when Enter is pressed in move mode to commit move", () => {
      const onTaskMove = vi.fn();
      render(
        <TaskBoard
          tasks={[
            { id: "t1", title: "Task to move", status: "inbox", priority: "high" },
          ]}
          onTaskMove={onTaskMove}
        />,
      );

      const board = screen.getByTestId("task-board");
      fireEvent.keyDown(board, { key: "ArrowDown" });
      fireEvent.keyDown(board, { key: "Enter" });

      // Navigate to next column (In Progress)
      fireEvent.keyDown(board, { key: "ArrowRight" });

      // Commit the move
      fireEvent.keyDown(board, { key: "Enter" });

      expect(onTaskMove).toHaveBeenCalledWith("t1", "in_progress");
    });

    it("does not call onTaskMove when moving to same column", () => {
      const onTaskMove = vi.fn();
      render(
        <TaskBoard
          tasks={[
            { id: "t1", title: "Task to move", status: "inbox", priority: "high" },
          ]}
          onTaskMove={onTaskMove}
        />,
      );

      const board = screen.getByTestId("task-board");
      fireEvent.keyDown(board, { key: "ArrowDown" });
      fireEvent.keyDown(board, { key: "Enter" });

      // Commit without changing column
      fireEvent.keyDown(board, { key: "Enter" });

      expect(onTaskMove).not.toHaveBeenCalled();
    });

    it("wraps column navigation from last to first", () => {
      render(
        <TaskBoard
          tasks={[
            { id: "t1", title: "Task to move", status: "done", priority: "high" },
          ]}
        />,
      );

      const board = screen.getByTestId("task-board");
      fireEvent.keyDown(board, { key: "ArrowDown" });
      fireEvent.keyDown(board, { key: "Enter" });

      // Navigate past last column should wrap to first
      fireEvent.keyDown(board, { key: "ArrowRight" });

      const inboxColumn = screen.getByRole("list", { name: /Inbox column/i });
      expect(inboxColumn.className).toContain("ring-indigo-400");
    });

    it("wraps column navigation from first to last", () => {
      render(
        <TaskBoard
          tasks={[
            { id: "t1", title: "Task to move", status: "inbox", priority: "high" },
          ]}
        />,
      );

      const board = screen.getByTestId("task-board");
      fireEvent.keyDown(board, { key: "ArrowDown" });
      fireEvent.keyDown(board, { key: "Enter" });

      // Navigate before first column should wrap to last
      fireEvent.keyDown(board, { key: "ArrowLeft" });

      const doneColumn = screen.getByRole("list", { name: /Done column/i });
      expect(doneColumn.className).toContain("ring-indigo-400");
    });
  });

  describe("keyboard navigation accessibility", () => {
    it("has proper ARIA attributes on the board", () => {
      render(
        <TaskBoard
          tasks={[{ id: "t1", title: "Task", status: "inbox", priority: "high" }]}
        />,
      );

      const board = screen.getByTestId("task-board");
      expect(board).toHaveAttribute("role", "region");
      expect(board).toHaveAttribute("aria-label", "Task board");
      expect(board).toHaveAttribute("tabIndex", "0");
    });

    it("has proper ARIA attributes on columns", () => {
      render(
        <TaskBoard
          tasks={[{ id: "t1", title: "Task", status: "inbox", priority: "high" }]}
        />,
      );

      const inboxColumn = screen.getByRole("list", { name: /Inbox column/i });
      expect(inboxColumn).toHaveAttribute("aria-label", "Inbox column");
    });

    it("has a live region for screen reader announcements", () => {
      render(
        <TaskBoard
          tasks={[{ id: "t1", title: "Task to move", status: "inbox", priority: "high" }]}
        />,
      );

      const board = screen.getByTestId("task-board");

      // The live region should exist
      const liveRegion = board.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveClass("sr-only");
    });

    it("updates aria-current on target column during move mode", () => {
      render(
        <TaskBoard
          tasks={[{ id: "t1", title: "Task to move", status: "inbox", priority: "high" }]}
        />,
      );

      const board = screen.getByTestId("task-board");
      fireEvent.keyDown(board, { key: "ArrowDown" });
      fireEvent.keyDown(board, { key: "Enter" });

      const inboxColumn = screen.getByRole("list", { name: /Inbox column/i });
      expect(inboxColumn).toHaveAttribute("aria-current", "true");
    });
  });

  describe("keyboard navigation edge cases", () => {
    it("does not navigate when board is empty", () => {
      render(<TaskBoard tasks={[]} />);

      const board = screen.getByTestId("task-board");
      // Should not throw
      fireEvent.keyDown(board, { key: "ArrowDown" });
      fireEvent.keyDown(board, { key: "ArrowUp" });
    });

    it("does not respond to keyboard events in readOnly mode", () => {
      const onTaskMove = vi.fn();
      render(
        <TaskBoard
          tasks={[{ id: "t1", title: "Task", status: "inbox", priority: "high" }]}
          onTaskMove={onTaskMove}
          readOnly={true}
        />,
      );

      const board = screen.getByTestId("task-board");
      fireEvent.keyDown(board, { key: "ArrowDown" });

      // In readOnly mode, cards should not have keyboard focus ring styles
      // Cards only have the permanent focus-visible styles, not the isKeyboardFocused styles
      const taskCard = screen.getByRole("button", { name: /Task/i });
      // Should not have ring-2 (which is added when isKeyboardFocused is true)
      expect(taskCard.className).not.toContain("ring-2 ring-[color:var(--accent)]");
    });

    it("handles rapid navigation key presses", () => {
      render(
        <TaskBoard
          tasks={[
            { id: "t1", title: "Task 1", status: "inbox", priority: "high" },
            { id: "t2", title: "Task 2", status: "inbox", priority: "medium" },
            { id: "t3", title: "Task 3", status: "inbox", priority: "low" },
          ]}
        />,
      );

      const board = screen.getByTestId("task-board");

      // Rapid fire key presses - should wrap around
      fireEvent.keyDown(board, { key: "ArrowDown" });
      fireEvent.keyDown(board, { key: "ArrowDown" });
      fireEvent.keyDown(board, { key: "ArrowDown" });
      fireEvent.keyDown(board, { key: "ArrowDown" });

      // After 4 down arrows with 3 tasks, we should be back at task 1
      const firstCard = screen.getByRole("button", { name: /Task 1/i });
      expect(firstCard.className).toContain("ring-");
    });
  });
});
