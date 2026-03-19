import { describe, it, expect } from "vitest";
import { cn } from "../utils";

describe("cn", () => {
  it("merges simple class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles undefined and null values", () => {
    expect(cn("foo", undefined, "bar", null)).toBe("foo bar");
  });

  it("handles boolean conditionals", () => {
    const isActive = true;
    const isDisabled = false;
    expect(cn("base", isActive && "active", isDisabled && "disabled")).toBe(
      "base active"
    );
  });

  it("deduplicates conflicting Tailwind padding classes", () => {
    // tailwind-merge should resolve conflicting utilities
    const result = cn("px-4", "px-2");
    expect(result).toBe("px-2");
  });

  it("deduplicates conflicting Tailwind background classes", () => {
    const result = cn("bg-red-500", "bg-blue-500");
    expect(result).toBe("bg-blue-500");
  });

  it("deduplicates conflicting Tailwind text color classes", () => {
    const result = cn("text-red-500", "text-blue-500");
    expect(result).toBe("text-blue-500");
  });

  it("preserves non-conflicting classes", () => {
    const result = cn("px-4", "py-2", "text-sm");
    expect(result).toBe("px-4 py-2 text-sm");
  });

  it("handles empty input", () => {
    expect(cn()).toBe("");
  });

  it("handles array input (clsx feature)", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });

  it("handles object input (clsx feature)", () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz");
  });

  it("handles complex mixed input", () => {
    const result = cn(
      "base-class",
      { conditional: true, hidden: false },
      undefined,
      "extra"
    );
    expect(result).toBe("base-class conditional extra");
  });

  it("handles Tailwind responsive prefix conflicts", () => {
    // md:px-4 and md:px-2 should merge
    const result = cn("md:px-4", "md:px-2");
    expect(result).toBe("md:px-2");
  });
});
