import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "../badge";

describe("Badge", () => {
  it("renders with default variant", () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText("Default");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("bg-bg-elevated");
    expect(badge.className).toContain("text-text-secondary");
  });

  it("renders as a span element", () => {
    render(<Badge>Test</Badge>);
    const badge = screen.getByText("Test");
    expect(badge.tagName.toLowerCase()).toBe("span");
  });

  it("renders healthy variant", () => {
    render(<Badge variant="healthy">Healthy</Badge>);
    const badge = screen.getByText("Healthy");
    expect(badge.className).toContain("bg-status-healthy");
    expect(badge.className).toContain("text-status-healthy");
    expect(badge.className).toContain("border-status-healthy");
  });

  it("renders warning variant", () => {
    render(<Badge variant="warning">Warning</Badge>);
    const badge = screen.getByText("Warning");
    expect(badge.className).toContain("bg-status-warning");
    expect(badge.className).toContain("text-status-warning");
  });

  it("renders critical variant", () => {
    render(<Badge variant="critical">Critical</Badge>);
    const badge = screen.getByText("Critical");
    expect(badge.className).toContain("bg-status-critical");
    expect(badge.className).toContain("text-status-critical");
  });

  it("renders info variant", () => {
    render(<Badge variant="info">Info</Badge>);
    const badge = screen.getByText("Info");
    expect(badge.className).toContain("bg-status-info");
    expect(badge.className).toContain("text-status-info");
  });

  it("renders neutral variant", () => {
    render(<Badge variant="neutral">Neutral</Badge>);
    const badge = screen.getByText("Neutral");
    expect(badge.className).toContain("bg-status-neutral");
    expect(badge.className).toContain("text-status-neutral");
  });

  it("applies custom className alongside variant styles", () => {
    render(
      <Badge variant="healthy" className="my-extra-class">
        Custom
      </Badge>
    );
    const badge = screen.getByText("Custom");
    expect(badge).toHaveClass("my-extra-class");
    // Variant class should still be applied
    expect(badge.className).toContain("text-status-healthy");
  });

  it("has base styling classes", () => {
    render(<Badge>Base</Badge>);
    const badge = screen.getByText("Base");
    expect(badge.className).toContain("inline-flex");
    expect(badge.className).toContain("items-center");
    expect(badge.className).toContain("rounded-md");
    expect(badge.className).toContain("text-xs");
    expect(badge.className).toContain("font-medium");
  });

  it("forwards additional HTML attributes", () => {
    render(<Badge data-testid="my-badge">Attr</Badge>);
    expect(screen.getByTestId("my-badge")).toBeInTheDocument();
  });
});
