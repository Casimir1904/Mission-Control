import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BulkActionsToolbar } from "./BulkActionsToolbar";

// Mock DropdownSelect to simplify testing
vi.mock("@/components/ui/dropdown-select", () => ({
  default: ({
    value,
    onValueChange,
    options,
    placeholder,
    ariaLabel,
    disabled,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    options: { value: string; label: string }[];
    placeholder: string;
    ariaLabel?: string;
    disabled?: boolean;
  }) => (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      aria-label={ariaLabel}
      disabled={disabled}
      data-testid={placeholder.toLowerCase().replace(/\s/g, "-")}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  ),
}));

// Mock ConfirmActionDialog
vi.mock("@/components/ui/confirm-action-dialog", () => ({
  ConfirmActionDialog: ({
    open,
    onOpenChange,
    title,
    description,
    onConfirm,
    isConfirming,
    errorMessage,
    confirmLabel,
    confirmingLabel,
    cancelLabel,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: React.ReactNode;
    onConfirm: () => void;
    isConfirming?: boolean;
    errorMessage?: string | null;
    confirmLabel: string;
    confirmingLabel: string;
    cancelLabel: string;
  }) => {
    if (!open) return null;
    return (
      <div role="dialog" aria-label="Confirm bulk deletion">
        <h2>{title}</h2>
        <div>{description}</div>
        {errorMessage && <div role="alert">{errorMessage}</div>}
        <button
          onClick={onConfirm}
          disabled={isConfirming}
          aria-label={isConfirming ? confirmingLabel : confirmLabel}
        >
          {isConfirming ? confirmingLabel : confirmLabel}
        </button>
        <button onClick={() => onOpenChange(false)}>{cancelLabel}</button>
      </div>
    );
  },
}));

describe("BulkActionsToolbar", () => {
  it("renders null when no actions are configured", () => {
    const { container } = render(
      <BulkActionsToolbar selectedCount={0} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders when onDelete is provided", () => {
    render(
      <BulkActionsToolbar
        selectedCount={2}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByRole("toolbar")).toBeInTheDocument();
    expect(screen.getByText("2 selected")).toBeInTheDocument();
  });

  it("renders when statusOptions are provided", () => {
    render(
      <BulkActionsToolbar
        selectedCount={1}
        statusOptions={[
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ]}
      />
    );

    expect(screen.getByRole("toolbar")).toBeInTheDocument();
    expect(screen.getByTestId("change-status")).toBeInTheDocument();
  });

  it("renders when tagOptions are provided", () => {
    render(
      <BulkActionsToolbar
        selectedCount={1}
        tagOptions={[
          { value: "tag1", label: "Tag 1" },
          { value: "tag2", label: "Tag 2" },
        ]}
      />
    );

    expect(screen.getByRole("toolbar")).toBeInTheDocument();
    expect(screen.getByTestId("assign-tag")).toBeInTheDocument();
  });

  it("displays selection count", () => {
    render(
      <BulkActionsToolbar
        selectedCount={5}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText("5 selected")).toBeInTheDocument();
  });

  it("displays total count when provided", () => {
    render(
      <BulkActionsToolbar
        selectedCount={3}
        totalCount={10}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText("3 selected")).toBeInTheDocument();
    expect(screen.getByText("of 10")).toBeInTheDocument();
  });

  it("uses custom selectionLabel", () => {
    render(
      <BulkActionsToolbar
        selectedCount={2}
        onDelete={vi.fn()}
        selectionLabel={(count) => `${count} items selected`}
      />
    );

    expect(screen.getByText("2 items selected")).toBeInTheDocument();
  });

  it("applies opacity-60 when no items are selected", () => {
    render(
      <BulkActionsToolbar
        selectedCount={0}
        onDelete={vi.fn()}
      />
    );

    const toolbar = screen.getByRole("toolbar");
    expect(toolbar).toHaveClass("opacity-60");
  });

  it("does not apply opacity-60 when items are selected", () => {
    render(
      <BulkActionsToolbar
        selectedCount={1}
        onDelete={vi.fn()}
      />
    );

    const toolbar = screen.getByRole("toolbar");
    expect(toolbar).not.toHaveClass("opacity-60");
  });

  it("applies custom className", () => {
    render(
      <BulkActionsToolbar
        selectedCount={1}
        onDelete={vi.fn()}
        className="custom-class"
      />
    );

    const toolbar = screen.getByRole("toolbar");
    expect(toolbar).toHaveClass("custom-class");
  });

  describe("delete action", () => {
    it("opens delete confirmation dialog when delete button is clicked", () => {
      render(
        <BulkActionsToolbar
          selectedCount={3}
          onDelete={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: "Delete" }));

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Delete 3 items?")).toBeInTheDocument();
    });

    it("calls onDelete when deletion is confirmed", () => {
      const onDelete = vi.fn();
      render(
        <BulkActionsToolbar
          selectedCount={2}
          onDelete={onDelete}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
      // Click the confirm button in the dialog (distinguished by aria-label)
      fireEvent.click(screen.getByLabelText("Delete"));

      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it("uses singular form for single item deletion", () => {
      render(
        <BulkActionsToolbar
          selectedCount={1}
          onDelete={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: "Delete" }));

      expect(screen.getByRole("heading", { name: "Delete 1 item?" })).toBeInTheDocument();
    });

    it("uses plural form for multiple item deletion", () => {
      render(
        <BulkActionsToolbar
          selectedCount={5}
          onDelete={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: "Delete" }));

      expect(screen.getByRole("heading", { name: "Delete 5 items?" })).toBeInTheDocument();
    });

    it("disables delete button when disabled prop is true", () => {
      render(
        <BulkActionsToolbar
          selectedCount={1}
          onDelete={vi.fn()}
          disabled
        />
      );

      expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
    });

    it("disables delete button when no items are selected", () => {
      render(
        <BulkActionsToolbar
          selectedCount={0}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
    });

    it("disables delete button when isDeleting is true", () => {
      render(
        <BulkActionsToolbar
          selectedCount={1}
          onDelete={vi.fn()}
          isDeleting
        />
      );

      expect(screen.getByRole("button", { name: "Deleting..." })).toBeDisabled();
    });

    it("shows 'Deleting...' text when isDeleting is true", () => {
      render(
        <BulkActionsToolbar
          selectedCount={1}
          onDelete={vi.fn()}
          isDeleting
        />
      );

      expect(screen.getByRole("button", { name: "Deleting..." })).toBeInTheDocument();
    });

    it("displays error message in dialog when provided", () => {
      render(
        <BulkActionsToolbar
          selectedCount={1}
          onDelete={vi.fn()}
          errorMessage="Failed to delete items"
        />
      );

      fireEvent.click(screen.getByRole("button", { name: "Delete" }));

      expect(screen.getByRole("alert")).toHaveTextContent("Failed to delete items");
    });

    it("closes dialog when cancel is clicked", () => {
      render(
        <BulkActionsToolbar
          selectedCount={1}
          onDelete={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("status change action", () => {
    it("calls onStatusChange when a status is selected", () => {
      const onStatusChange = vi.fn();
      render(
        <BulkActionsToolbar
          selectedCount={2}
          statusOptions={[
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ]}
          onStatusChange={onStatusChange}
        />
      );

      fireEvent.change(screen.getByTestId("change-status"), {
        target: { value: "active" },
      });

      expect(onStatusChange).toHaveBeenCalledWith("active");
    });

    it("disables status dropdown when disabled prop is true", () => {
      render(
        <BulkActionsToolbar
          selectedCount={1}
          statusOptions={[{ value: "active", label: "Active" }]}
          onStatusChange={vi.fn()}
          disabled
        />
      );

      expect(screen.getByTestId("change-status")).toBeDisabled();
    });

    it("disables status dropdown when no items are selected", () => {
      render(
        <BulkActionsToolbar
          selectedCount={0}
          statusOptions={[{ value: "active", label: "Active" }]}
          onStatusChange={vi.fn()}
        />
      );

      expect(screen.getByTestId("change-status")).toBeDisabled();
    });

    it("disables status dropdown when isChangingStatus is true", () => {
      render(
        <BulkActionsToolbar
          selectedCount={1}
          statusOptions={[{ value: "active", label: "Active" }]}
          onStatusChange={vi.fn()}
          isChangingStatus
        />
      );

      expect(screen.getByTestId("change-status")).toBeDisabled();
    });
  });

  describe("tag assignment action", () => {
    it("calls onAssignTag when a tag is selected", () => {
      const onAssignTag = vi.fn();
      render(
        <BulkActionsToolbar
          selectedCount={2}
          tagOptions={[
            { value: "tag1", label: "Tag 1" },
            { value: "tag2", label: "Tag 2" },
          ]}
          onAssignTag={onAssignTag}
        />
      );

      fireEvent.change(screen.getByTestId("assign-tag"), {
        target: { value: "tag1" },
      });

      expect(onAssignTag).toHaveBeenCalledWith("tag1");
    });

    it("disables tag dropdown when disabled prop is true", () => {
      render(
        <BulkActionsToolbar
          selectedCount={1}
          tagOptions={[{ value: "tag1", label: "Tag 1" }]}
          onAssignTag={vi.fn()}
          disabled
        />
      );

      expect(screen.getByTestId("assign-tag")).toBeDisabled();
    });

    it("disables tag dropdown when no items are selected", () => {
      render(
        <BulkActionsToolbar
          selectedCount={0}
          tagOptions={[{ value: "tag1", label: "Tag 1" }]}
          onAssignTag={vi.fn()}
        />
      );

      expect(screen.getByTestId("assign-tag")).toBeDisabled();
    });

    it("disables tag dropdown when isAssigningTag is true", () => {
      render(
        <BulkActionsToolbar
          selectedCount={1}
          tagOptions={[{ value: "tag1", label: "Tag 1" }]}
          onAssignTag={vi.fn()}
          isAssigningTag
        />
      );

      expect(screen.getByTestId("assign-tag")).toBeDisabled();
    });
  });

  describe("clear selection action", () => {
    it("renders clear button when onClearSelection is provided and items are selected", () => {
      render(
        <BulkActionsToolbar
          selectedCount={2}
          onDelete={vi.fn()}
          onClearSelection={vi.fn()}
        />
      );

      expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument();
    });

    it("does not render clear button when no items are selected", () => {
      render(
        <BulkActionsToolbar
          selectedCount={0}
          onDelete={vi.fn()}
          onClearSelection={vi.fn()}
        />
      );

      expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
    });

    it("calls onClearSelection when clear button is clicked", () => {
      const onClearSelection = vi.fn();
      render(
        <BulkActionsToolbar
          selectedCount={2}
          onDelete={vi.fn()}
          onClearSelection={onClearSelection}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: "Clear" }));

      expect(onClearSelection).toHaveBeenCalledTimes(1);
    });

    it("disables clear button when disabled prop is true", () => {
      render(
        <BulkActionsToolbar
          selectedCount={2}
          onDelete={vi.fn()}
          onClearSelection={vi.fn()}
          disabled
        />
      );

      expect(screen.getByRole("button", { name: "Clear" })).toBeDisabled();
    });
  });

  describe("accessibility", () => {
    it("has correct toolbar role and aria-label", () => {
      render(
        <BulkActionsToolbar
          selectedCount={1}
          onDelete={vi.fn()}
        />
      );

      const toolbar = screen.getByRole("toolbar");
      expect(toolbar).toHaveAttribute("aria-label", "Bulk actions");
    });

    it("delete dialog has correct aria-label", () => {
      render(
        <BulkActionsToolbar
          selectedCount={1}
          onDelete={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: "Delete" }));

      expect(screen.getByRole("dialog")).toHaveAttribute(
        "aria-label",
        "Confirm bulk deletion"
      );
    });
  });
});
