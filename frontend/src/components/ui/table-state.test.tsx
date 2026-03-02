import type React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  TableLoadingRow,
  TableEmptyStateRow,
  EnhancedEmptyStateRow,
} from "./table-state";

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

describe("TableLoadingRow", () => {
  it("renders default loading message", () => {
    render(
      <table>
        <tbody>
          <TableLoadingRow colSpan={3} />
        </tbody>
      </table>,
    );

    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("renders custom loading label", () => {
    render(
      <table>
        <tbody>
          <TableLoadingRow colSpan={3} label="Fetching data..." />
        </tbody>
      </table>,
    );

    expect(screen.getByText("Fetching data...")).toBeInTheDocument();
  });

  it("sets correct colSpan", () => {
    const { container } = render(
      <table>
        <tbody>
          <TableLoadingRow colSpan={5} />
        </tbody>
      </table>,
    );

    const td = container.querySelector("td");
    expect(td).toHaveAttribute("colspan", "5");
  });
});

describe("TableEmptyStateRow", () => {
  const defaultProps = {
    colSpan: 3,
    icon: <span data-testid="empty-icon">Icon</span>,
    title: "No items found",
    description: "There are no items to display.",
  };

  it("renders icon, title, and description", () => {
    render(
      <table>
        <tbody>
          <TableEmptyStateRow {...defaultProps} />
        </tbody>
      </table>,
    );

    expect(screen.getByTestId("empty-icon")).toBeInTheDocument();
    expect(screen.getByText("No items found")).toBeInTheDocument();
    expect(screen.getByText("There are no items to display.")).toBeInTheDocument();
  });

  it("renders action button when actionHref and actionLabel are provided", () => {
    render(
      <table>
        <tbody>
          <TableEmptyStateRow
            {...defaultProps}
            actionHref="/create"
            actionLabel="Create Item"
          />
        </tbody>
      </table>,
    );

    const actionLink = screen.getByRole("link", { name: "Create Item" });
    expect(actionLink).toBeInTheDocument();
    expect(actionLink).toHaveAttribute("href", "/create");
  });

  it("does not render action button when actionHref is missing", () => {
    render(
      <table>
        <tbody>
          <TableEmptyStateRow {...defaultProps} actionLabel="Create Item" />
        </tbody>
      </table>,
    );

    expect(
      screen.queryByRole("link", { name: "Create Item" }),
    ).not.toBeInTheDocument();
  });

  it("does not render action button when actionLabel is missing", () => {
    render(
      <table>
        <tbody>
          <TableEmptyStateRow {...defaultProps} actionHref="/create" />
        </tbody>
      </table>,
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("sets correct colSpan", () => {
    const { container } = render(
      <table>
        <tbody>
          <TableEmptyStateRow {...defaultProps} colSpan={4} />
        </tbody>
      </table>,
    );

    const td = container.querySelector("td");
    expect(td).toHaveAttribute("colspan", "4");
  });
});

describe("EnhancedEmptyStateRow", () => {
  const defaultProps = {
    colSpan: 3,
    icon: <span data-testid="enhanced-icon">Icon</span>,
    title: "Get started",
    description: "Choose an option below to get started.",
    quickActions: [
      { label: "Create New", href: "/create" },
      { label: "Import", href: "/import", variant: "secondary" as const },
    ],
  };

  it("renders icon, title, and description", () => {
    render(
      <table>
        <tbody>
          <EnhancedEmptyStateRow {...defaultProps} />
        </tbody>
      </table>,
    );

    expect(screen.getByTestId("enhanced-icon")).toBeInTheDocument();
    expect(screen.getByText("Get started")).toBeInTheDocument();
    expect(
      screen.getByText("Choose an option below to get started."),
    ).toBeInTheDocument();
  });

  it("renders quick actions as links", () => {
    render(
      <table>
        <tbody>
          <EnhancedEmptyStateRow {...defaultProps} />
        </tbody>
      </table>,
    );

    const createLink = screen.getByRole("link", { name: "Create New" });
    expect(createLink).toBeInTheDocument();
    expect(createLink).toHaveAttribute("href", "/create");

    const importLink = screen.getByRole("link", { name: "Import" });
    expect(importLink).toBeInTheDocument();
    expect(importLink).toHaveAttribute("href", "/import");
  });

  it("renders quick action with icon", () => {
    render(
      <table>
        <tbody>
          <EnhancedEmptyStateRow
            {...defaultProps}
            quickActions={[
              {
                label: "Add Item",
                href: "/add",
                icon: <span data-testid="plus-icon">+</span>,
              },
            ]}
          />
        </tbody>
      </table>,
    );

    expect(screen.getByTestId("plus-icon")).toBeInTheDocument();
    expect(screen.getByText("Add Item")).toBeInTheDocument();
  });

  it("does not render quick actions section when quickActions is empty", () => {
    render(
      <table>
        <tbody>
          <EnhancedEmptyStateRow {...defaultProps} quickActions={[]} />
        </tbody>
      </table>,
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders learn more link when learnMoreHref is provided", () => {
    render(
      <table>
        <tbody>
          <EnhancedEmptyStateRow {...defaultProps} learnMoreHref="/help" />
        </tbody>
      </table>,
    );

    const learnMoreLink = screen.getByRole("link", { name: "Learn more" });
    expect(learnMoreLink).toBeInTheDocument();
    expect(learnMoreLink).toHaveAttribute("href", "/help");
  });

  it("does not render learn more link when learnMoreHref is not provided", () => {
    render(
      <table>
        <tbody>
          <EnhancedEmptyStateRow {...defaultProps} />
        </tbody>
      </table>,
    );

    expect(
      screen.queryByRole("link", { name: "Learn more" }),
    ).not.toBeInTheDocument();
  });

  it("sets correct colSpan", () => {
    const { container } = render(
      <table>
        <tbody>
          <EnhancedEmptyStateRow {...defaultProps} colSpan={6} />
        </tbody>
      </table>,
    );

    const td = container.querySelector("td");
    expect(td).toHaveAttribute("colspan", "6");
  });
});
