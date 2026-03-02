"use client";

import * as React from "react";
import { Trash2, Tag, Circle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import DropdownSelect, {
  type DropdownSelectOption,
} from "@/components/ui/dropdown-select";
import { cn } from "@/lib/utils";

type BulkActionsToolbarProps = {
  /** Number of currently selected items */
  selectedCount: number;
  /** Total number of items available (for "select all" context) */
  totalCount?: number;
  /** Available status options for the status change dropdown */
  statusOptions?: DropdownSelectOption[];
  /** Available tag options for the tag assignment dropdown */
  tagOptions?: DropdownSelectOption[];
  /** Callback when delete is confirmed */
  onDelete?: () => void;
  /** Callback when status is changed */
  onStatusChange?: (status: string) => void;
  /** Callback when tags are assigned */
  onAssignTag?: (tag: string) => void;
  /** Callback to clear selection */
  onClearSelection?: () => void;
  /** Whether delete operation is in progress */
  isDeleting?: boolean;
  /** Whether status change operation is in progress */
  isChangingStatus?: boolean;
  /** Whether tag assignment operation is in progress */
  isAssigningTag?: boolean;
  /** Error message from the last operation */
  errorMessage?: string | null;
  /** Custom class name for the toolbar */
  className?: string;
  /** Whether the toolbar is disabled */
  disabled?: boolean;
  /** Label for the selected items count (defaults to "X selected") */
  selectionLabel?: (count: number) => string;
};

export function BulkActionsToolbar({
  selectedCount,
  totalCount,
  statusOptions,
  tagOptions,
  onDelete,
  onStatusChange,
  onAssignTag,
  onClearSelection,
  isDeleting = false,
  isChangingStatus = false,
  isAssigningTag = false,
  errorMessage = null,
  className,
  disabled = false,
  selectionLabel = (count) => `${count} selected`,
}: BulkActionsToolbarProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const hasSelection = selectedCount > 0;
  const hasStatusOptions = statusOptions && statusOptions.length > 0;
  const hasTagOptions = tagOptions && tagOptions.length > 0;
  const hasAnyAction = onDelete || hasStatusOptions || hasTagOptions;

  // Don't render if there are no actions configured
  if (!hasAnyAction) {
    return null;
  }

  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    onDelete?.();
    // Note: Dialog closure is typically handled by parent when isDeleting becomes false
  };

  const handleStatusChange = (value: string) => {
    onStatusChange?.(value);
  };

  const handleTagAssign = (value: string) => {
    onAssignTag?.(value);
  };

  return (
    <>
      <div
        className={cn(
          "flex items-center justify-between gap-4 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] p-3",
          !hasSelection && "opacity-60",
          className,
        )}
        role="toolbar"
        aria-label="Bulk actions"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-[color:var(--text-strong)]">
            {selectionLabel(selectedCount)}
          </span>
          {totalCount !== undefined && hasSelection && (
            <span className="text-xs text-[color:var(--text-muted)]">
              of {totalCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Status Change Dropdown */}
          {hasStatusOptions && (
            <DropdownSelect
              value=""
              onValueChange={handleStatusChange}
              options={statusOptions}
              placeholder="Change status"
              ariaLabel="Select status to apply"
              disabled={disabled || !hasSelection || isChangingStatus}
              searchEnabled={statusOptions.length > 8}
              searchPlaceholder="Search status..."
              emptyMessage="No statuses available"
              triggerClassName="h-9 px-3 text-sm"
            />
          )}

          {/* Tag Assignment Dropdown */}
          {hasTagOptions && (
            <DropdownSelect
              value=""
              onValueChange={handleTagAssign}
              options={tagOptions}
              placeholder="Assign tag"
              ariaLabel="Select tag to assign"
              disabled={disabled || !hasSelection || isAssigningTag}
              searchEnabled={tagOptions.length > 8}
              searchPlaceholder="Search tag..."
              emptyMessage="No tags available"
              triggerClassName="h-9 px-3 text-sm"
            />
          )}

          {/* Delete Button */}
          {onDelete && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDeleteClick}
              disabled={disabled || !hasSelection || isDeleting}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">
                {isDeleting ? "Deleting..." : "Delete"}
              </span>
            </Button>
          )}

          {/* Clear Selection Button */}
          {onClearSelection && hasSelection && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              disabled={disabled}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {onDelete && (
        <ConfirmActionDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          title={`Delete ${selectedCount} item${selectedCount === 1 ? "" : "s"}?`}
          description={
            <span>
              Are you sure you want to delete{" "}
              <strong>
                {selectedCount} item{selectedCount === 1 ? "" : "s"}
              </strong>
              ? This action cannot be undone.
            </span>
          }
          onConfirm={handleConfirmDelete}
          isConfirming={isDeleting}
          errorMessage={errorMessage}
          confirmLabel="Delete"
          confirmingLabel="Deleting..."
          cancelLabel="Cancel"
          ariaLabel="Confirm bulk deletion"
        />
      )}
    </>
  );
}

export default BulkActionsToolbar;
