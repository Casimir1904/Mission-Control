import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  type ColumnDef,
  type RowSelectionState,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./DataTable";

vi.mock("next/link", () => {
  type LinkProps = React.PropsWithChildren<{
    href: string | { pathname?: string };
  }> &
    Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">;

  return {
    default: ({ href, children, ...props }: LinkProps) => (
      <a href={typeof href === "string" ? href : "#"} {...props}>
        {children}
      </a>
    ),
  };
});

type Row = {
  id: string;
  name: string;
};

type HarnessProps = {
  rows: Row[];
  isLoading?: boolean;
  emptyMessage?: string;
  emptyState?: React.ComponentProps<typeof DataTable<Row>>["emptyState"];
  rowActions?: React.ComponentProps<typeof DataTable<Row>>["rowActions"];
  exportComponent?: React.ComponentProps<typeof DataTable<Row>>["export"];
};

function DataTableHarness({
  rows,
  isLoading = false,
  emptyMessage,
  emptyState,
  rowActions,
  exportComponent,
}: HarnessProps) {
  const columns: ColumnDef<Row>[] = [{ accessorKey: "name", header: "Name" }];
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <DataTable
      table={table}
      isLoading={isLoading}
      emptyMessage={emptyMessage}
      emptyState={emptyState}
      rowActions={rowActions}
      export={exportComponent}
    />
  );
}

type SelectionHarnessProps = {
  rows: Row[];
  enableRowSelection?: boolean;
  initialSelection?: RowSelectionState;
  onSelectionChange?: (selection: RowSelectionState) => void;
  getRowId?: (row: Row) => string;
};

function DataTableWithSelectionHarness({
  rows,
  enableRowSelection = true,
  initialSelection = {},
  onSelectionChange,
  getRowId = (row: Row) => row.id,
}: SelectionHarnessProps) {
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>(
    initialSelection,
  );

  const columns: ColumnDef<Row>[] = [{ accessorKey: "name", header: "Name" }];
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: {
      rowSelection,
    },
    enableRowSelection,
    onRowSelectionChange: (updater) => {
      const newSelection =
        typeof updater === "function" ? updater(rowSelection) : updater;
      setRowSelection(newSelection);
      onSelectionChange?.(newSelection);
    },
    getRowId,
  });

  return (
    <DataTable
      table={table}
      enableRowSelection={enableRowSelection}
    />
  );
}

describe("DataTable", () => {
  it("renders default Edit/Delete row actions", () => {
    const onDelete = vi.fn();
    const row = { id: "row-1", name: "Alpha" };

    render(
      <DataTableHarness
        rows={[row]}
        rowActions={{
          getEditHref: (current) => `/items/${current.id}/edit`,
          onDelete,
        }}
      />,
    );

    const editLink = screen.getByRole("link", { name: "Edit" });
    expect(editLink).toHaveAttribute("href", "/items/row-1/edit");

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledWith(row);
  });

  it("uses custom row actions when provided", () => {
    const onArchive = vi.fn();
    const row = { id: "row-1", name: "Alpha" };

    render(
      <DataTableHarness
        rows={[row]}
        rowActions={{
          getEditHref: (current) => `/items/${current.id}/edit`,
          onDelete: vi.fn(),
          actions: [
            {
              key: "view",
              label: "View",
              href: (current) => `/items/${current.id}`,
            },
            {
              key: "archive",
              label: "Archive",
              onClick: onArchive,
            },
          ],
        }}
      />,
    );

    expect(screen.getByRole("link", { name: "View" })).toHaveAttribute(
      "href",
      "/items/row-1",
    );
    expect(screen.getByRole("button", { name: "Archive" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Edit" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Delete" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    expect(onArchive).toHaveBeenCalledWith(row);
  });

  it("renders loading and empty states", () => {
    const { rerender } = render(
      <DataTableHarness rows={[]} isLoading={true} />,
    );
    expect(screen.getByText("Loading…")).toBeInTheDocument();

    rerender(
      <DataTableHarness
        rows={[]}
        isLoading={false}
        emptyMessage="No rows yet"
      />,
    );
    expect(screen.getByText("No rows yet")).toBeInTheDocument();
  });

  it("renders custom empty state", () => {
    render(
      <DataTableHarness
        rows={[]}
        emptyState={{
          icon: <span data-testid="empty-icon">icon</span>,
          title: "No records",
          description: "Create one to continue.",
          actionHref: "/new",
          actionLabel: "Create",
        }}
      />,
    );

    expect(screen.getByTestId("empty-icon")).toBeInTheDocument();
    expect(screen.getByText("No records")).toBeInTheDocument();
    expect(screen.getByText("Create one to continue.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create" })).toHaveAttribute(
      "href",
      "/new",
    );
  });

  it("renders export component when provided", () => {
    const onExportCsv = vi.fn();
    const onExportJson = vi.fn();

    render(
      <DataTableHarness
        rows={[{ id: "row-1", name: "Alpha" }]}
        exportComponent={
          <div>
            <button type="button" onClick={onExportCsv}>Export CSV</button>
            <button type="button" onClick={onExportJson}>Export JSON</button>
          </div>
        }
      />,
    );

    expect(screen.getByRole("button", { name: "Export CSV" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export JSON" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));
    expect(onExportCsv).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Export JSON" }));
    expect(onExportJson).toHaveBeenCalled();
  });

  it("does not render export section when export component is not provided", () => {
    const { container } = render(
      <DataTableHarness rows={[{ id: "row-1", name: "Alpha" }]} />,
    );

    // The export container should not exist
    const exportContainer = container.querySelector(
      ".flex.items-center.justify-end",
    );
    expect(exportContainer).not.toBeInTheDocument();
  });

  describe("row selection", () => {
    it("renders checkboxes when enableRowSelection is true", () => {
      render(
        <DataTableWithSelectionHarness
          rows={[
            { id: "1", name: "Alpha" },
            { id: "2", name: "Beta" },
          ]}
        />,
      );

      // Header checkbox (select all)
      expect(screen.getByLabelText("Select all rows")).toBeInTheDocument();

      // Row checkboxes
      expect(screen.getAllByLabelText("Select row")).toHaveLength(2);
    });

    it("does not render checkboxes when enableRowSelection is false", () => {
      render(
        <DataTableWithSelectionHarness
          rows={[{ id: "1", name: "Alpha" }]}
          enableRowSelection={false}
        />,
      );

      expect(screen.queryByLabelText("Select all rows")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Select row")).not.toBeInTheDocument();
    });

    it("toggles row selection on checkbox click", () => {
      const onSelectionChange = vi.fn();
      render(
        <DataTableWithSelectionHarness
          rows={[
            { id: "1", name: "Alpha" },
            { id: "2", name: "Beta" },
          ]}
          onSelectionChange={onSelectionChange}
        />,
      );

      const checkboxes = screen.getAllByLabelText("Select row");

      // Select first row
      fireEvent.click(checkboxes[0]);
      expect(onSelectionChange).toHaveBeenLastCalledWith({ "1": true });

      // Select second row
      fireEvent.click(checkboxes[1]);
      expect(onSelectionChange).toHaveBeenLastCalledWith({ "1": true, "2": true });

      // Deselect first row
      fireEvent.click(checkboxes[0]);
      expect(onSelectionChange).toHaveBeenLastCalledWith({ "2": true });
    });

    it("selects all rows when header checkbox is clicked", () => {
      const onSelectionChange = vi.fn();
      render(
        <DataTableWithSelectionHarness
          rows={[
            { id: "1", name: "Alpha" },
            { id: "2", name: "Beta" },
          ]}
          onSelectionChange={onSelectionChange}
        />,
      );

      const selectAllCheckbox = screen.getByLabelText("Select all rows");

      // Select all
      fireEvent.click(selectAllCheckbox);
      expect(onSelectionChange).toHaveBeenLastCalledWith({ "1": true, "2": true });

      // Deselect all
      fireEvent.click(selectAllCheckbox);
      expect(onSelectionChange).toHaveBeenLastCalledWith({});
    });

    it("initializes with pre-selected rows", () => {
      render(
        <DataTableWithSelectionHarness
          rows={[
            { id: "1", name: "Alpha" },
            { id: "2", name: "Beta" },
          ]}
          initialSelection={{ "1": true }}
        />,
      );

      const checkboxes = screen.getAllByLabelText("Select row");
      expect(checkboxes[0]).toBeChecked();
      expect(checkboxes[1]).not.toBeChecked();
    });

    it("works with custom getRowId function", () => {
      const onSelectionChange = vi.fn();
      render(
        <DataTableWithSelectionHarness
          rows={[
            { id: "1", name: "Alpha" },
            { id: "2", name: "Beta" },
          ]}
          getRowId={(row) => `custom-${row.id}`}
          onSelectionChange={onSelectionChange}
        />,
      );

      const checkboxes = screen.getAllByLabelText("Select row");
      fireEvent.click(checkboxes[0]);

      expect(onSelectionChange).toHaveBeenLastCalledWith({ "custom-1": true });
    });
  });
});
