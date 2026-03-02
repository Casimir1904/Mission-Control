import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { useUrlFiltering } from "./use-url-filtering";

const replaceMock = vi.fn();
let mockPathname = "/agents";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
  usePathname: () => mockPathname,
}));

describe("useUrlFiltering", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    mockPathname = "/agents";
    window.history.replaceState({}, "", "/agents");
  });

  it("uses default filters when no params are present", () => {
    const { result } = renderHook(() =>
      useUrlFiltering({
        allowedColumnIds: ["name", "status"],
        defaultColumnFilters: [{ id: "status", value: "active" }],
        paramPrefix: "agents",
      }),
    );

    expect(result.current.columnFilters).toEqual([{ id: "status", value: "active" }]);
  });

  it("returns empty filters when no defaults and no params", () => {
    const { result } = renderHook(() =>
      useUrlFiltering({
        allowedColumnIds: ["name", "status"],
        paramPrefix: "agents",
      }),
    );

    expect(result.current.columnFilters).toEqual([]);
  });

  it("reads filters from URL params", () => {
    window.history.replaceState(
      {},
      "",
      "/agents?agents_filter_name=John&agents_filter_status=pending",
    );

    const { result } = renderHook(() =>
      useUrlFiltering({
        allowedColumnIds: ["name", "status"],
        paramPrefix: "agents",
      }),
    );

    expect(result.current.columnFilters).toEqual([
      { id: "name", value: "John" },
      { id: "status", value: "pending" },
    ]);
  });

  it("reads complex filter values from URL params", () => {
    window.history.replaceState(
      {},
      "",
      '/agents?agents_filter_tags=["tag1","tag2"]',
    );

    const { result } = renderHook(() =>
      useUrlFiltering({
        allowedColumnIds: ["tags"],
        paramPrefix: "agents",
      }),
    );

    expect(result.current.columnFilters).toEqual([
      { id: "tags", value: ["tag1", "tag2"] },
    ]);
  });

  it("ignores filters for non-allowed column ids", () => {
    window.history.replaceState(
      {},
      "",
      "/agents?agents_filter_name=John&agents_filter_unauthorized=value",
    );

    const { result } = renderHook(() =>
      useUrlFiltering({
        allowedColumnIds: ["name"],
        paramPrefix: "agents",
      }),
    );

    expect(result.current.columnFilters).toEqual([{ id: "name", value: "John" }]);
  });

  it("writes updated filters to URL and preserves unrelated params", () => {
    window.history.replaceState({}, "", "/agents?foo=1");

    const { result } = renderHook(() =>
      useUrlFiltering({
        allowedColumnIds: ["name", "status"],
        paramPrefix: "agents",
      }),
    );

    act(() => {
      result.current.onColumnFiltersChange([{ id: "status", value: "active" }]);
    });

    expect(replaceMock).toHaveBeenCalledWith(
      "/agents?foo=1&agents_filter_status=active",
      {
        scroll: false,
      },
    );
  });

  it("removes filter params when clearing filters", () => {
    window.history.replaceState(
      {},
      "",
      "/agents?foo=1&agents_filter_status=active",
    );

    const { result } = renderHook(() =>
      useUrlFiltering({
        allowedColumnIds: ["name", "status"],
        paramPrefix: "agents",
      }),
    );

    act(() => {
      result.current.onColumnFiltersChange([]);
    });

    expect(replaceMock).toHaveBeenCalledWith("/agents?foo=1", {
      scroll: false,
    });
  });

  it("removes filter params when returning to default filters", () => {
    window.history.replaceState(
      {},
      "",
      "/agents?foo=1&agents_filter_status=pending",
    );

    const { result } = renderHook(() =>
      useUrlFiltering({
        allowedColumnIds: ["name", "status"],
        defaultColumnFilters: [{ id: "status", value: "active" }],
        paramPrefix: "agents",
      }),
    );

    act(() => {
      result.current.onColumnFiltersChange([{ id: "status", value: "active" }]);
    });

    expect(replaceMock).toHaveBeenCalledWith("/agents?foo=1", {
      scroll: false,
    });
  });

  it("supports functional updater for onColumnFiltersChange", () => {
    window.history.replaceState({}, "", "/agents");

    const { result } = renderHook(() =>
      useUrlFiltering({
        allowedColumnIds: ["status"],
        paramPrefix: "agents",
      }),
    );

    act(() => {
      result.current.onColumnFiltersChange((prev) => [
        ...prev,
        { id: "status", value: "active" },
      ]);
    });

    expect(replaceMock).toHaveBeenCalledWith(
      "/agents?agents_filter_status=active",
      {
        scroll: false,
      },
    );
  });

  it("works without paramPrefix", () => {
    window.history.replaceState(
      {},
      "",
      "/agents?filter_name=John",
    );

    const { result } = renderHook(() =>
      useUrlFiltering({
        allowedColumnIds: ["name"],
      }),
    );

    expect(result.current.columnFilters).toEqual([{ id: "name", value: "John" }]);

    act(() => {
      result.current.onColumnFiltersChange([{ id: "name", value: "Jane" }]);
    });

    expect(replaceMock).toHaveBeenCalledWith(
      "/agents?filter_name=Jane",
      {
        scroll: false,
      },
    );
  });

  it("handles multiple filters simultaneously", () => {
    window.history.replaceState({}, "", "/agents");

    const { result } = renderHook(() =>
      useUrlFiltering({
        allowedColumnIds: ["name", "status", "type"],
        paramPrefix: "agents",
      }),
    );

    act(() => {
      result.current.onColumnFiltersChange([
        { id: "name", value: "John" },
        { id: "status", value: "active" },
        { id: "type", value: "user" },
      ]);
    });

    const call = replaceMock.mock.calls[0][0] as string;
    expect(call).toContain("agents_filter_name=");
    expect(call).toContain("agents_filter_status=");
    expect(call).toContain("agents_filter_type=");
  });

  it("handles plain string values without JSON serialization", () => {
    window.history.replaceState({}, "", "/agents");

    const { result } = renderHook(() =>
      useUrlFiltering({
        allowedColumnIds: ["name"],
        paramPrefix: "agents",
      }),
    );

    act(() => {
      result.current.onColumnFiltersChange([{ id: "name", value: "simple" }]);
    });

    expect(replaceMock).toHaveBeenCalledWith(
      "/agents?agents_filter_name=simple",
      {
        scroll: false,
      },
    );
  });

  it("falls back to raw value when JSON parsing fails", () => {
    window.history.replaceState(
      {},
      "",
      "/agents?agents_filter_name=invalid{json",
    );

    const { result } = renderHook(() =>
      useUrlFiltering({
        allowedColumnIds: ["name"],
        paramPrefix: "agents",
      }),
    );

    expect(result.current.columnFilters).toEqual([{ id: "name", value: "invalid{json" }]);
  });

  it("does not update URL when filters are unchanged", () => {
    window.history.replaceState(
      {},
      "",
      "/agents?agents_filter_status=active",
    );

    const { result } = renderHook(() =>
      useUrlFiltering({
        allowedColumnIds: ["status"],
        paramPrefix: "agents",
      }),
    );

    act(() => {
      result.current.onColumnFiltersChange([{ id: "status", value: "active" }]);
    });

    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("handles empty defaultColumnFilters correctly", () => {
    const { result } = renderHook(() =>
      useUrlFiltering({
        allowedColumnIds: ["name"],
        defaultColumnFilters: [],
        paramPrefix: "agents",
      }),
    );

    expect(result.current.columnFilters).toEqual([]);
  });
});
