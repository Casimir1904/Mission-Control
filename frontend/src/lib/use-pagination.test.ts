import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { usePagination } from "./use-pagination";

const replaceMock = vi.fn();
let mockPathname = "/items";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
  usePathname: () => mockPathname,
}));

describe("usePagination", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    mockPathname = "/items";
    window.history.replaceState({}, "", "/items");
  });

  it("uses default pagination when no params are present", () => {
    const { result } = renderHook(() => usePagination());

    expect(result.current.pagination).toEqual({
      pageIndex: 0,
      pageSize: 10,
    });
  });

  it("uses custom defaults when provided", () => {
    const { result } = renderHook(() =>
      usePagination({
        defaultPage: 2,
        defaultPageSize: 25,
      }),
    );

    expect(result.current.pagination).toEqual({
      pageIndex: 1,
      pageSize: 25,
    });
  });

  it("reads pagination from URL params", () => {
    window.history.replaceState({}, "", "/items?page=3&pageSize=25");

    const { result } = renderHook(() => usePagination());

    expect(result.current.pagination).toEqual({
      pageIndex: 2,
      pageSize: 25,
    });
  });

  it("reads pagination with prefix from URL params", () => {
    window.history.replaceState({}, "", "/items?items_page=2&items_pageSize=50");

    const { result } = renderHook(() =>
      usePagination({
        paramPrefix: "items",
      }),
    );

    expect(result.current.pagination).toEqual({
      pageIndex: 1,
      pageSize: 50,
    });
  });

  it("ignores params with different prefix", () => {
    window.history.replaceState({}, "", "/items?other_page=5&other_pageSize=100");

    const { result } = renderHook(() =>
      usePagination({
        paramPrefix: "items",
      }),
    );

    expect(result.current.pagination).toEqual({
      pageIndex: 0,
      pageSize: 10,
    });
  });

  it("updates pagination and URL when calling onPaginationChange", () => {
    const { result } = renderHook(() => usePagination());

    act(() => {
      result.current.onPaginationChange({ pageIndex: 2, pageSize: 25 });
    });

    expect(result.current.pagination).toEqual({
      pageIndex: 2,
      pageSize: 25,
    });
    expect(replaceMock).toHaveBeenCalledWith("/items?page=3&pageSize=25", {
      scroll: false,
    });
  });

  it("removes params when values match defaults", () => {
    window.history.replaceState({}, "", "/items?page=5&pageSize=25");

    const { result } = renderHook(() =>
      usePagination({
        defaultPage: 1,
        defaultPageSize: 10,
      }),
    );

    act(() => {
      result.current.onPaginationChange({ pageIndex: 0, pageSize: 10 });
    });

    expect(replaceMock).toHaveBeenCalledWith("/items", {
      scroll: false,
    });
  });

  it("preserves unrelated URL params when updating", () => {
    window.history.replaceState({}, "", "/items?filter=active&sort=name");

    const { result } = renderHook(() => usePagination());

    act(() => {
      result.current.onPaginationChange({ pageIndex: 1, pageSize: 10 });
    });

    expect(replaceMock).toHaveBeenCalledWith(
      "/items?filter=active&sort=name&page=2",
      { scroll: false },
    );
  });

  it("normalizes invalid page to minimum value", () => {
    window.history.replaceState({}, "", "/items?page=0");

    const { result } = renderHook(() => usePagination());

    expect(result.current.pagination.pageIndex).toBe(0);
  });

  it("normalizes negative page to minimum value", () => {
    window.history.replaceState({}, "", "/items?page=-5");

    const { result } = renderHook(() => usePagination());

    expect(result.current.pagination.pageIndex).toBe(0);
  });

  it("normalizes invalid pageSize to default", () => {
    window.history.replaceState({}, "", "/items?pageSize=0");

    const { result } = renderHook(() => usePagination());

    expect(result.current.pagination.pageSize).toBe(10);
  });

  it("normalizes pageSize not in allowed options to default", () => {
    window.history.replaceState({}, "", "/items?pageSize=99");

    const { result } = renderHook(() =>
      usePagination({
        pageSizeOptions: [10, 25, 50, 100],
      }),
    );

    expect(result.current.pagination.pageSize).toBe(10);
  });

  it("accepts pageSize from custom options list", () => {
    window.history.replaceState({}, "", "/items?pageSize=50");

    const { result } = renderHook(() =>
      usePagination({
        pageSizeOptions: [10, 25, 50, 100],
      }),
    );

    expect(result.current.pagination.pageSize).toBe(50);
  });

  it("handles functional update in onPaginationChange", () => {
    const { result } = renderHook(() => usePagination());

    act(() => {
      result.current.onPaginationChange((prev) => ({
        pageIndex: prev.pageIndex + 1,
        pageSize: prev.pageSize,
      }));
    });

    expect(result.current.pagination).toEqual({
      pageIndex: 1,
      pageSize: 10,
    });
    expect(replaceMock).toHaveBeenCalledWith("/items?page=2", {
      scroll: false,
    });
  });

  it("does not update URL if pagination hasn't changed", () => {
    window.history.replaceState({}, "", "/items?page=2");

    const { result } = renderHook(() => usePagination());

    act(() => {
      result.current.onPaginationChange({ pageIndex: 1, pageSize: 10 });
    });

    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("handles non-numeric page param gracefully", () => {
    window.history.replaceState({}, "", "/items?page=abc");

    const { result } = renderHook(() => usePagination());

    expect(result.current.pagination.pageIndex).toBe(0);
  });

  it("handles non-numeric pageSize param gracefully", () => {
    window.history.replaceState({}, "", "/items?pageSize=xyz");

    const { result } = renderHook(() => usePagination());

    expect(result.current.pagination.pageSize).toBe(10);
  });

  it("uses first pageSizeOption as default when custom defaultPageSize is not in options", () => {
    const { result } = renderHook(() =>
      usePagination({
        defaultPageSize: 15,
        pageSizeOptions: [10, 25, 50, 100],
      }),
    );

    expect(result.current.pagination.pageSize).toBe(15);
  });
});
