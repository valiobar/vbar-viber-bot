"use client";

/**
 * Keyboards list widget
 *
 * Fetch/pagination/filter state via useResourceList; table stays in this
 * widget because the keyboard entity has no list table (only previews).
 */

import { useCallback, useState } from "react";
import Link from "next/link";
import { ErrorMessage, Pagination, useResourceList } from "@/shared";
import {
  deleteKeyboard,
  listKeyboards,
  updateKeyboard,
  type KeyboardDTO,
  type ListKeyboardsResult,
} from "@/entities/keyboard";
import { BulkActions } from "@/features/message-manage";

interface KeyboardsListProps {
  initialData?: ListKeyboardsResult;
}

type KeyboardListFilters = {
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

export const KeyboardsList = ({ initialData }: KeyboardsListProps) => {
  const fetcher = useCallback(
    async (
      filters: KeyboardListFilters,
      pagination: { page: number; limit: number }
    ) => {
      const result = await listKeyboards(
        {
          search: filters.search.trim() || undefined,
          hidden: filters.hidden,
          isTemplate: filters.isTemplate,
        },
        pagination
      );
      return {
        items: result.keyboards,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      };
    },
    []
  );

  const {
    items: keyboards,
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
  } = useResourceList<KeyboardDTO, KeyboardListFilters>({
    fetcher,
    initialData: initialData
      ? {
          items: initialData.keyboards,
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

  const sortedKeyboards = [...keyboards].sort((a, b) => {
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
      setSelectedIds(new Set(sortedKeyboards.map((k) => k.id)));
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
        `Are you sure you want to delete ${selectedIds.size} keyboard(s)? This action cannot be undone.`
      )
    ) {
      return;
    }

    setIsBulkActionLoading(true);
    setError(null);

    try {
      const results = await Promise.allSettled(
        Array.from(selectedIds).map((id) => deleteKeyboard(id))
      );
      const errors = results.filter((r) => r.status === "rejected");

      if (errors.length > 0) {
        setError(
          `Failed to delete ${errors.length} keyboard(s). Please try again.`
        );
      } else {
        setSelectedIds(new Set());
        await refetch();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete keyboards"
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
        Array.from(selectedIds).map((id) => updateKeyboard(id, { hidden }))
      );
      const errors = results.filter((r) => r.status === "rejected");

      if (errors.length > 0) {
        setError(
          `Failed to ${hidden ? "hide" : "show"} ${
            errors.length
          } keyboard(s). Please try again.`
        );
      } else {
        setSelectedIds(new Set());
        await refetch();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to ${hidden ? "hide" : "show"} keyboards`
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
      await deleteKeyboard(id);
      await refetch();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete keyboard"
      );
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleToggleHidden = async (id: string, currentHidden: boolean) => {
    setIsBulkActionLoading(true);
    setError(null);

    try {
      await updateKeyboard(id, { hidden: !currentHidden });
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update keyboard");
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

  const renderKeyboardTable = () => {
    if (isLoading) {
      return (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          Loading...
        </div>
      );
    }

    if (sortedKeyboards.length === 0) {
      return (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          No keyboards found.
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th scope="col" className="w-12 px-6 py-3">
                <input
                  type="checkbox"
                  checked={
                    sortedKeyboards.length > 0 &&
                    selectedIds.size === sortedKeyboards.length
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
                Title
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                Buttons
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                Broadcast
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
            {sortedKeyboards.map((keyboard) => (
              <tr
                key={keyboard.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(keyboard.id)}
                    onChange={(e) =>
                      handleSelect(keyboard.id, e.target.checked)
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link
                    href={`/keyboards/${keyboard.id}`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {keyboard.humanReadableName}
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {keyboard.title || (
                      <span className="text-gray-400 dark:text-gray-500">
                        —
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {keyboard.Buttons.length}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {keyboard.isBroadcast ? (
                    <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800 dark:bg-green-900 dark:text-green-200">
                      Yes
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                      No
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {keyboard.isTemplate ? (
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
                  {keyboard.hidden ? (
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
                  {formatDate(keyboard.createdAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <Link
                      href={`/keyboards/${keyboard.id}`}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() =>
                        handleToggleHidden(keyboard.id, keyboard.hidden)
                      }
                      disabled={isBulkActionLoading}
                      className="text-gray-600 hover:text-gray-900 disabled:opacity-50 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      {keyboard.hidden ? "Show" : "Hide"}
                    </button>
                    <button
                      onClick={() =>
                        handleDelete(keyboard.id, keyboard.humanReadableName)
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Keyboards
        </h1>
        <Link
          href="/keyboards/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-800"
        >
          Create Keyboard
        </Link>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <label
              htmlFor="search"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Search
            </label>
            <input
              type="text"
              id="search"
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              placeholder="Search by name or title..."
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="hiddenFilter"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Hidden
            </label>
            <select
              id="hiddenFilter"
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
              htmlFor="templateFilter"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Template
            </label>
            <select
              id="templateFilter"
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
                  isTemplate:
                    value === "all" ? undefined : value === "true",
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
        itemLabel="keyboard(s)"
        onHide={() => handleBulkToggleHidden(true)}
        onShow={() => handleBulkToggleHidden(false)}
        onDelete={handleBulkDelete}
      />

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow dark:border-gray-700 dark:bg-gray-800">
        {renderKeyboardTable()}

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
