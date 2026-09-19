"use client";

/**
 * Carousels list widget
 *
 * Fetch/pagination/filter state via useResourceList; table stays in this
 * widget because the carousel entity has no list table (only previews).
 */

import { useCallback, useState } from "react";
import Link from "next/link";
import { ErrorMessage, Pagination, useResourceList } from "@/shared";
import {
  deleteCarousel,
  listCarousels,
  updateCarousel,
  type CarouselDTO,
  type ListCarouselsResult,
} from "@/entities/carousel";
import { BulkActions } from "@/features/message-manage";

interface CarouselsListProps {
  initialData?: ListCarouselsResult;
}

type CarouselListFilters = {
  search: string;
  hidden?: boolean;
  isTemplate?: boolean;
};

type SortField = "humanReadableName" | "createdAt";
type SortDirection = "asc" | "desc";

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const CarouselsList = ({ initialData }: CarouselsListProps) => {
  const fetcher = useCallback(
    async (
      filters: CarouselListFilters,
      pagination: { page: number; limit: number }
    ) => {
      const result = await listCarousels(
        {
          search: filters.search.trim() || undefined,
          hidden: filters.hidden,
          isTemplate: filters.isTemplate,
        },
        pagination
      );
      return {
        items: result.carousels,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      };
    },
    []
  );

  const {
    items: carousels,
    total,
    page,
    limit,
    totalPages,
    filters,
    setFilters,
    setPage,
    isLoading,
    error,
    setError,
    refetch,
  } = useResourceList<CarouselDTO, CarouselListFilters>({
    fetcher,
    initialData: initialData
      ? {
          items: initialData.carousels,
          total: initialData.total,
          page: initialData.page,
          limit: initialData.limit,
          totalPages: initialData.totalPages,
        }
      : undefined,
    initialFilters: { search: "" },
    initialPage: initialData?.page ?? 1,
    initialLimit: initialData?.limit ?? 10,
  });

  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

  const sortedCarousels = [...carousels].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    if (sortField === "humanReadableName") {
      aValue = a.humanReadableName.toLowerCase();
      bValue = b.humanReadableName.toLowerCase();
    } else {
      aValue = new Date(a.createdAt).getTime();
      bValue = new Date(b.createdAt).getTime();
    }

    if (sortDirection === "asc") {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    }
    return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(sortedCarousels.map((c) => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    setSelectedIds(next);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    if (
      !confirm(
        `Are you sure you want to delete ${selectedIds.size} carousel(s)? This action cannot be undone.`
      )
    ) {
      return;
    }

    setIsBulkActionLoading(true);
    setError(null);

    try {
      const results = await Promise.allSettled(
        Array.from(selectedIds).map((id) => deleteCarousel(id))
      );
      const errors = results.filter((r) => r.status === "rejected");

      if (errors.length > 0) {
        setError(
          `Failed to delete ${errors.length} carousel(s). Please try again.`
        );
      } else {
        setSelectedIds(new Set());
        await refetch();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete carousels"
      );
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleBulkToggleHidden = async (hidden: boolean) => {
    if (selectedIds.size === 0) return;

    setIsBulkActionLoading(true);
    setError(null);

    try {
      const results = await Promise.allSettled(
        Array.from(selectedIds).map((id) => updateCarousel(id, { hidden }))
      );
      const errors = results.filter((r) => r.status === "rejected");

      if (errors.length > 0) {
        setError(
          `Failed to ${hidden ? "hide" : "show"} ${
            errors.length
          } carousel(s). Please try again.`
        );
      } else {
        setSelectedIds(new Set());
        await refetch();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to ${hidden ? "hide" : "show"} carousels`
      );
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    setIsBulkActionLoading(true);
    setError(null);

    try {
      await deleteCarousel(id);
      await refetch();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete carousel"
      );
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleToggleHidden = async (id: string, currentHidden: boolean) => {
    setIsBulkActionLoading(true);
    setError(null);

    try {
      await updateCarousel(id, { hidden: !currentHidden });
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update carousel");
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const sortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return null;
    }
    const arrow = sortDirection === "asc" ? "↑" : "↓";
    return <span>{arrow}</span>;
  };

  const renderCarouselTable = () => {
    if (isLoading && sortedCarousels.length === 0) {
      return (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          Loading...
        </div>
      );
    }

    if (sortedCarousels.length === 0) {
      return (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          No carousels found.
        </div>
      );
    }

    return (
      <div
        className={`overflow-x-auto transition-opacity ${
          isLoading ? "pointer-events-none opacity-60" : ""
        }`}
      >
        <table
          className="min-w-full divide-y divide-gray-200 dark:divide-gray-700"
          data-testid="carousels-table"
        >
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th scope="col" className="w-12 px-6 py-3">
                <input
                  type="checkbox"
                  aria-label="Select all carousels"
                  checked={
                    sortedCarousels.length > 0 &&
                    selectedIds.size === sortedCarousels.length
                  }
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
                />
              </th>
              <th
                scope="col"
                className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                onClick={() => handleSort("humanReadableName")}
              >
                <div className="flex items-center space-x-1">
                  <span>Name</span>
                  {sortIndicator("humanReadableName")}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                Cards
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                Block
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                Template
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                Hidden
              </th>
              <th
                scope="col"
                className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                onClick={() => handleSort("createdAt")}
              >
                <div className="flex items-center space-x-1">
                  <span>Created</span>
                  {sortIndicator("createdAt")}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
            {sortedCarousels.map((carousel) => (
              <tr
                key={carousel.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    aria-label={`Select ${carousel.humanReadableName}`}
                    checked={selectedIds.has(carousel.id)}
                    onChange={(e) =>
                      handleSelect(carousel.id, e.target.checked)
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link
                    href={`/carousels/${carousel.id}`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {carousel.humanReadableName}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {carousel.Cards.length}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {carousel.ButtonsGroupColumns} × {carousel.ButtonsGroupRows}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {carousel.isTemplate ? (
                    <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      Yes
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                      No
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {carousel.hidden ? (
                    <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800 dark:bg-red-900 dark:text-red-200">
                      Hidden
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                      Visible
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(carousel.createdAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <Link
                      href={`/carousels/${carousel.id}`}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      aria-label={
                        carousel.hidden
                          ? `Show ${carousel.humanReadableName}`
                          : `Hide ${carousel.humanReadableName}`
                      }
                      onClick={() =>
                        handleToggleHidden(carousel.id, carousel.hidden)
                      }
                      disabled={isBulkActionLoading}
                      className="text-gray-600 hover:text-gray-900 disabled:opacity-50 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      {carousel.hidden ? "Show" : "Hide"}
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${carousel.humanReadableName}`}
                      onClick={() =>
                        handleDelete(carousel.id, carousel.humanReadableName)
                      }
                      disabled={isBulkActionLoading}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6" data-testid="carousels-list">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Carousels
        </h1>
        <Link
          href="/carousels/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-800"
          data-testid="create-carousel-link"
        >
          Create Carousel
        </Link>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-1">
            <label
              htmlFor="carousel-search"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Search
            </label>
            <input
              type="text"
              id="carousel-search"
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              placeholder="Search by name..."
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="carousel-hidden-filter"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Hidden
            </label>
            <select
              id="carousel-hidden-filter"
              aria-label="Filter by hidden"
              value={
                filters.hidden === undefined
                  ? "all"
                  : filters.hidden
                    ? "true"
                    : "false"
              }
              onChange={(e) => {
                const value = e.target.value;
                setFilters((prev) => ({
                  ...prev,
                  hidden:
                    value === "all" ? undefined : value === "true" ? true : false,
                }));
              }}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All</option>
              <option value="true">Hidden</option>
              <option value="false">Visible</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="carousel-template-filter"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Template
            </label>
            <select
              id="carousel-template-filter"
              aria-label="Filter by template"
              value={
                filters.isTemplate === undefined
                  ? "all"
                  : filters.isTemplate
                    ? "true"
                    : "false"
              }
              onChange={(e) => {
                const value = e.target.value;
                setFilters((prev) => ({
                  ...prev,
                  isTemplate: value === "all" ? undefined : value === "true",
                }));
              }}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All</option>
              <option value="true">Templates</option>
              <option value="false">Regular</option>
            </select>
          </div>
        </div>
      </div>

      <ErrorMessage error={error} />

      <BulkActions
        selectedCount={selectedIds.size}
        isLoading={isBulkActionLoading}
        itemLabel="carousel(s)"
        onHide={() => handleBulkToggleHidden(true)}
        onShow={() => handleBulkToggleHidden(false)}
        onDelete={handleBulkDelete}
      />

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow dark:border-gray-700 dark:bg-gray-800">
        {renderCarouselTable()}

        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          isLoading={isLoading}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
};
