import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  type ColumnFiltersState,
  type OnChangeFn,
  functionalUpdate,
} from "@tanstack/react-table";

type UseUrlFilteringOptions = {
  allowedColumnIds: string[];
  defaultColumnFilters?: ColumnFiltersState;
  paramPrefix?: string;
};

type UseUrlFilteringResult = {
  columnFilters: ColumnFiltersState;
  onColumnFiltersChange: OnChangeFn<ColumnFiltersState>;
};

const resolveFilterParam = (columnId: string, paramPrefix?: string) =>
  paramPrefix ? `${paramPrefix}_filter_${columnId}` : `filter_${columnId}`;

const normalizeColumnFilters = (
  value: ColumnFiltersState,
  allowedColumnIds: Set<string>,
): ColumnFiltersState => {
  return value.filter((filter) => allowedColumnIds.has(filter.id));
};

const isSameColumnFilters = (
  a: ColumnFiltersState,
  b: ColumnFiltersState,
): boolean => {
  if (a.length !== b.length) return false;
  if (a.length === 0) return true;

  const aMap = new Map(a.map((f) => [f.id, f.value]));
  const bMap = new Map(b.map((f) => [f.id, f.value]));

  for (const [id, value] of aMap) {
    if (!bMap.has(id)) return false;
    const bValue = bMap.get(id);
    if (JSON.stringify(value) !== JSON.stringify(bValue)) return false;
  }

  return true;
};

export function useUrlFiltering({
  allowedColumnIds,
  defaultColumnFilters = [],
  paramPrefix,
}: UseUrlFilteringOptions): UseUrlFilteringResult {
  const router = useRouter();
  const pathname = usePathname();
  const [searchParamsString, setSearchParamsString] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }
    return window.location.search.replace(/^\?/, "");
  });

  const allowedSet = useMemo(
    () => new Set(allowedColumnIds),
    [allowedColumnIds],
  );
  const normalizedDefaultColumnFilters = useMemo(
    () => normalizeColumnFilters(defaultColumnFilters, allowedSet),
    [defaultColumnFilters, allowedSet],
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

  const columnFilters = useMemo(() => {
    const searchParams = new URLSearchParams(searchParamsString);
    const filters: ColumnFiltersState = [];

    for (const columnId of allowedSet) {
      const paramName = resolveFilterParam(columnId, paramPrefix);
      const value = searchParams.get(paramName);

      if (value !== null) {
        try {
          filters.push({ id: columnId, value: JSON.parse(value) });
        } catch {
          filters.push({ id: columnId, value });
        }
      }
    }

    return filters.length > 0 ? filters : normalizedDefaultColumnFilters;
  }, [allowedSet, normalizedDefaultColumnFilters, paramPrefix, searchParamsString]);

  const onColumnFiltersChange = useCallback<OnChangeFn<ColumnFiltersState>>(
    (updater) => {
      const nextFilters = normalizeColumnFilters(
        functionalUpdate(updater, columnFilters),
        allowedSet,
      );

      if (isSameColumnFilters(nextFilters, columnFilters)) {
        return;
      }

      const nextParams = new URLSearchParams(searchParamsString);

      const nextFiltersMap = new Map(nextFilters.map((f) => [f.id, f.value]));
      const defaultFiltersMap = new Map(
        normalizedDefaultColumnFilters.map((f) => [f.id, f.value]),
      );

      for (const columnId of allowedSet) {
        const paramName = resolveFilterParam(columnId, paramPrefix);
        const nextValue = nextFiltersMap.get(columnId);
        const defaultValue = defaultFiltersMap.get(columnId);

        if (nextValue === undefined) {
          nextParams.delete(paramName);
        } else if (
          normalizedDefaultColumnFilters.length > 0 &&
          JSON.stringify(nextValue) === JSON.stringify(defaultValue)
        ) {
          nextParams.delete(paramName);
        } else {
          const serializedValue =
            typeof nextValue === "string" ? nextValue : JSON.stringify(nextValue);
          nextParams.set(paramName, serializedValue);
        }
      }

      const query = nextParams.toString();
      setSearchParamsString(query);
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [
      allowedSet,
      columnFilters,
      normalizedDefaultColumnFilters,
      pathname,
      router,
      searchParamsString,
      paramPrefix,
    ],
  );

  return { columnFilters, onColumnFiltersChange };
}
