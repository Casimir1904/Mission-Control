import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  type OnChangeFn,
  type PaginationState,
  functionalUpdate,
} from "@tanstack/react-table";

type UsePaginationOptions = {
  defaultPage?: number;
  defaultPageSize?: number;
  paramPrefix?: string;
  pageSizeOptions?: number[];
};

type UsePaginationResult = {
  pagination: PaginationState;
  onPaginationChange: OnChangeFn<PaginationState>;
};

const resolvePageParam = (paramPrefix?: string) =>
  paramPrefix ? `${paramPrefix}_page` : "page";

const resolvePageSizeParam = (paramPrefix?: string) =>
  paramPrefix ? `${paramPrefix}_pageSize` : "pageSize";

const normalizePage = (value: number, minPage: number): number => {
  if (!Number.isFinite(value) || value < minPage) {
    return minPage;
  }
  return Math.floor(value);
};

const normalizePageSize = (
  value: number,
  allowedSizes: number[],
  defaultSize: number,
): number => {
  if (!Number.isFinite(value) || value < 1) {
    return defaultSize;
  }
  const size = Math.floor(value);
  if (allowedSizes.includes(size)) {
    return size;
  }
  return defaultSize;
};

const isSamePagination = (a: PaginationState, b: PaginationState) => {
  return a.pageIndex === b.pageIndex && a.pageSize === b.pageSize;
};

export function usePagination({
  defaultPage = 1,
  defaultPageSize = 10,
  paramPrefix,
  pageSizeOptions = [10, 25, 50, 100],
}: UsePaginationOptions = {}): UsePaginationResult {
  const router = useRouter();
  const pathname = usePathname();
  const [searchParamsString, setSearchParamsString] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }
    return window.location.search.replace(/^\?/, "");
  });

  const pageParam = resolvePageParam(paramPrefix);
  const pageSizeParam = resolvePageSizeParam(paramPrefix);

  const normalizedDefaultPagination = useMemo(
    () => ({
      pageIndex: Math.max(0, defaultPage - 1),
      pageSize: defaultPageSize,
    }),
    [defaultPage, defaultPageSize],
  );

  useEffect(() => {
    const syncFromLocation = () => {
      setSearchParamsString(window.location.search.replace(/^\?/, ""));
    };

    syncFromLocation();
    window.addEventListener("popstate", syncFromLocation);

    return () => {
      window.removeEventListener("popstate", syncFromLocation);
    };
  }, [pathname]);

  const pagination = useMemo(() => {
    const searchParams = new URLSearchParams(searchParamsString);
    const pageValue = searchParams.get(pageParam);
    const pageSizeValue = searchParams.get(pageSizeParam);

    if (!pageValue && !pageSizeValue) {
      return normalizedDefaultPagination;
    }

    const pageFromUrl = pageValue ? parseInt(pageValue, 10) : defaultPage;
    const pageSizeFromUrl = pageSizeValue
      ? parseInt(pageSizeValue, 10)
      : defaultPageSize;

    const normalizedPageSize = normalizePageSize(
      pageSizeFromUrl,
      pageSizeOptions,
      defaultPageSize,
    );

    // When page size changes, reset to first page if current page is invalid
    const minPage = 1;
    const normalizedPage = normalizePage(pageFromUrl, minPage);

    return {
      pageIndex: normalizedPage - 1,
      pageSize: normalizedPageSize,
    };
  }, [
    searchParamsString,
    pageParam,
    pageSizeParam,
    defaultPage,
    defaultPageSize,
    pageSizeOptions,
    normalizedDefaultPagination,
  ]);

  const onPaginationChange = useCallback<OnChangeFn<PaginationState>>(
    (updater) => {
      const nextPagination = functionalUpdate(updater, pagination);

      const normalizedNextPagination = {
        pageIndex: normalizePage(nextPagination.pageIndex + 1, 1) - 1,
        pageSize: normalizePageSize(
          nextPagination.pageSize,
          pageSizeOptions,
          defaultPageSize,
        ),
      };

      if (isSamePagination(normalizedNextPagination, pagination)) {
        return;
      }

      const nextParams = new URLSearchParams(searchParamsString);

      const nextPage = normalizedNextPagination.pageIndex + 1;
      const nextPageSize = normalizedNextPagination.pageSize;

      // Remove params if they match defaults
      if (nextPage === defaultPage) {
        nextParams.delete(pageParam);
      } else {
        nextParams.set(pageParam, String(nextPage));
      }

      if (nextPageSize === defaultPageSize) {
        nextParams.delete(pageSizeParam);
      } else {
        nextParams.set(pageSizeParam, String(nextPageSize));
      }

      const query = nextParams.toString();
      setSearchParamsString(query);
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [
      pagination,
      pageSizeOptions,
      defaultPageSize,
      defaultPage,
      searchParamsString,
      pageParam,
      pageSizeParam,
      pathname,
      router,
    ],
  );

  return { pagination, onPaginationChange };
}
