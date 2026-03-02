import type React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  type ColumnDef,
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
};

function DataTableHarness({
  rows,
  isLoading = false,
  emptyMessage,
  emptyState,
  rowActions,
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

  it("renders enhanced empty state with quick actions", () => {
    render(
      <DataTableHarness
        rows={[]}
        emptyState={{
          icon: <span data-testid="empty-icon">icon</span>,
          title: "No customers yet",
          description:
            "Get started by creating a new customer or importing your existing list.",
          quickActions: [
            {
              label: "Create Customer",
              href: "/customers/new",
            },
            {
              label: "Import",
              href: "/customers/import",
              variant: "secondary",
            },
          ],
        }}
      />,
    );

    expect(screen.getByTestId("empty-icon")).toBeInTheDocument();
    expect(screen.getByText("No customers yet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Get started by creating a new customer or importing your existing list.",
      ),
    ).toBeInTheDocument();

    const createLink = screen.getByRole("link", { name: "Create Customer" });
    expect(createLink).toHaveAttribute("href", "/customers/new");

    const importLink = screen.getByRole("link", { name: "Import" });
    expect(importLink).toHaveAttribute("href", "/customers/import");
  });

  it("renders enhanced empty state with quick actions and learn more link", () => {
    render(
      <DataTableHarness
        rows={[]}
        emptyState={{
          icon: <span data-testid="empty-icon">icon</span>,
          title: "No projects",
          description: "Create your first project to get started.",
          quickActions: [
            {
              label: "Create Project",
              href: "/projects/new",
            },
          ],
          learnMoreHref: "/help/projects",
        }}
      />,
    );

    expect(screen.getByTestId("empty-icon")).toBeInTheDocument();
    expect(screen.getByText("No projects")).toBeInTheDocument();
    expect(
      screen.getByText("Create your first project to get started."),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "Create Project" }),
    ).toHaveAttribute("href", "/projects/new");

    const learnMoreLink = screen.getByRole("link", { name: "Learn more" });
    expect(learnMoreLink).toHaveAttribute("href", "/help/projects");
  });

  it("renders enhanced empty state with quick actions containing icons", () => {
    render(
      <DataTableHarness
        rows={[]}
        emptyState={{
          icon: <span data-testid="empty-icon">icon</span>,
          title: "No tasks",
          description: "Create a task to get started.",
          quickActions: [
            {
              label: "Add Task",
              href: "/tasks/new",
              icon: <span data-testid="plus-icon">+</span>,
            },
          ],
        }}
      />,
    );

    expect(screen.getByTestId("empty-icon")).toBeInTheDocument();
    expect(screen.getByText("No tasks")).toBeInTheDocument();
    expect(
      screen.getByText("Create a task to get started."),
    ).toBeInTheDocument();

    // When icon is present, the accessible name includes the icon text
    const addTaskLink = screen.getByRole("link", { name: /Add Task/ });
    expect(addTaskLink).toHaveAttribute("href", "/tasks/new");
    expect(screen.getByTestId("plus-icon")).toBeInTheDocument();
  });
});
