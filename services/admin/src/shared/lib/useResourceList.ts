"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ResourceListResult<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type UseResourceListOptions<
  TItem,
  TFilters extends Record<string, unknown>,
> = {
  fetcher: (
    filters: TFilters,
    pagination: { page: number; limit: number }
  ) => Promise<ResourceListResult<TItem>>;
  initialData?: ResourceListResult<TItem>;
  initialFilters?: TFilters;
  initialPage?: number;
  initialLimit?: number;
  debounceMs?: number;
};

export const useResourceList = <
  TItem,
  TFilters extends Record<string, unknown>,
>({
  fetcher,
  initialData,
  initialFilters,
  initialPage = 1,
  initialLimit = 10,
  debounceMs = 500,
}: UseResourceListOptions<TItem, TFilters>) => {
  const [items, setItems] = useState<TItem[]>(initialData?.items ?? []);
  const [total, setTotal] = useState(initialData?.total ?? 0);
  const [page, setPage] = useState(initialData?.page ?? initialPage);
  const [limit, setLimit] = useState(initialData?.limit ?? initialLimit);
  const [totalPages, setTotalPages] = useState(initialData?.totalPages ?? 0);
  const [filters, setFiltersState] = useState<TFilters>(
    initialFilters ?? ({} as TFilters)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetchPage = useCallback(
    async (nextPage: number, nextLimit: number, nextFilters: TFilters) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await fetcher(nextFilters, {
          page: nextPage,
          limit: nextLimit,
        });
        setItems(result.items);
        setTotal(result.total);
        setPage(result.page);
        setLimit(result.limit);
        setTotalPages(result.totalPages);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch");
      } finally {
        setIsLoading(false);
      }
    },
    [fetcher]
  );

  useEffect(() => {
    void fetchPage(page, limit, filtersRef.current);
  }, [page, limit, fetchPage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (page !== 1) {
        setPage(1);
      } else {
        void fetchPage(1, limit, filters);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
    // page/limit/fetchPage are intentionally omitted: filter changes debounce
    // independently and reset to page 1, matching the existing list behavior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, debounceMs]);

  const setFilters = useCallback((next: TFilters | ((prev: TFilters) => TFilters)) => {
    setFiltersState(next);
  }, []);

  return {
    items,
    total,
    page,
    limit,
    totalPages,
    filters,
    setFilters,
    setPage,
    setLimit,
    isLoading,
    error,
    setError,
    refetch: () => fetchPage(page, limit, filters),
  };
};
