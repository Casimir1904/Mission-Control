import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Inbox, Plus } from "lucide-react";
import { EmptyState } from "../empty-state";

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(
      <EmptyState
        icon={Inbox}
        title="No tasks yet"
        description="Create your first task to get started."
      />
    );
    expect(
      screen.getByRole("heading", { name: "No tasks yet" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Create your first task to get started.")
    ).toBeInTheDocument();
  });

  it("renders the icon", () => {
    const { container } = render(
      <EmptyState
        icon={Inbox}
        title="Empty"
        description="No items"
      />
    );
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("renders action button when provided", () => {
    render(
      <EmptyState
        icon={Inbox}
        title="No boards"
        description="Start by creating a board."
        action={<button>Create Board</button>}
      />
    );
    expect(
      screen.getByRole("button", { name: "Create Board" })
    ).toBeInTheDocument();
  });

  it("does not render action area when action is not provided", () => {
    const { container } = render(
      <EmptyState
        icon={Inbox}
        title="Empty"
        description="Nothing here"
      />
    );
    // The last child should be the description paragraph, not a div wrapping an action
    const buttons = container.querySelectorAll("button");
    expect(buttons).toHaveLength(0);
  });

  it("applies custom className", () => {
    const { container } = render(
      <EmptyState
        icon={Inbox}
        title="Empty"
        description="Nothing"
        className="my-custom-class"
      />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass("my-custom-class");
  });

  it("has centered flex layout", () => {
    const { container } = render(
      <EmptyState
        icon={Inbox}
        title="Empty"
        description="Nothing"
      />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass("flex");
    expect(wrapper).toHaveClass("flex-col");
    expect(wrapper).toHaveClass("items-center");
    expect(wrapper).toHaveClass("justify-center");
    expect(wrapper).toHaveClass("text-center");
  });

  it("renders title as h2 element", () => {
    render(
      <EmptyState
        icon={Inbox}
        title="Heading Level Check"
        description="Checking semantic HTML"
      />
    );
    const heading = screen.getByRole("heading", {
      level: 2,
      name: "Heading Level Check",
    });
    expect(heading).toBeInTheDocument();
  });

  it("renders complex action content", () => {
    render(
      <EmptyState
        icon={Plus}
        title="No agents"
        description="Add an agent to your board."
        action={
          <div>
            <button>Primary Action</button>
            <a href="/docs">Learn more</a>
          </div>
        }
      />
    );
    expect(
      screen.getByRole("button", { name: "Primary Action" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Learn more" })
    ).toBeInTheDocument();
  });
});
