"use client";

/**
 * KeyboardsList Component
 *
 * Table/list component for displaying keyboards with pagination, search, filtering,
 * sorting, and bulk actions (delete, hide/show).
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { KeyboardDTO } from "@/domains/keyboard/application/dto/KeyboardDTO";
import type { ListKeyboardsResult } from "@/domains/keyboard/ports/in/ListKeyboardsUseCase";
import type { ApiResponse } from "@vbar/shared";
import Pagination from "@/components/common/Pagination";

interface KeyboardsListProps {
  /**
   * Initial data (optional, for SSR)
   */
  initialData?: ListKeyboardsResult;
}

type SortField = "humanReadableName" | "createdAt";
type SortDirection = "asc" | "desc";

const KeyboardsList = ({ initialData }: KeyboardsListProps) => {
  const router = useRouter();

  // Data state
  const [keyboards, setKeyboards] = useState<KeyboardDTO[]>(
    initialData?.keyboards || []
  );
  const [total, setTotal] = useState(initialData?.total || 0);
  const [page, setPage] = useState(initialData?.page || 1);
  const [limit, setLimit] = useState(initialData?.limit || 10);
  const [totalPages, setTotalPages] = useState(initialData?.totalPages || 0);

  // Filter state
  const [search, setSearch] = useState("");
  const [hiddenFilter, setHiddenFilter] = useState<boolean | undefined>(
    undefined
  );

  // Sort state
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

  /**
   * Fetch keyboards from API
   */
  const fetchKeyboards = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", limit.toString());

      if (search.trim()) {
        params.set("search", search.trim());
      }
      if (hiddenFilter !== undefined) {
        params.set("hidden", hiddenFilter.toString());
      }

      const response = await fetch(`/api/keyboards?${params.toString()}`);
      const data: ApiResponse<ListKeyboardsResult> = await response.json();

      if (data.error) {
        setError(data.error.message);
        return;
      }

      if (data.data) {
        setKeyboards(data.data.keyboards);
        setTotal(data.data.total);
        setPage(data.data.page);
        setLimit(data.data.limit);
        setTotalPages(data.data.totalPages);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch keyboards"
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, hiddenFilter]);

  /**
   * Load keyboards on mount and when filters change
   */
  useEffect(() => {
    fetchKeyboards();
  }, [fetchKeyboards]);

  /**
   * Handle search with debounce
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page !== 1) {
        setPage(1); // Reset to first page when search changes
      } else {
        fetchKeyboards();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  /**
   * Reset to first page when filters change
   */
  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    } else {
      fetchKeyboards();
    }
  }, [hiddenFilter]);

  /**
   * Sort keyboards (client-side sorting)
   */
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
    } else {
      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
    }
  });

  /**
   * Handle sort column click
   */
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  /**
   * Handle select/deselect all
   */
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(sortedKeyboards.map((k) => k.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  /**
   * Handle select/deselect single
   */
  const handleSelect = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  /**
   * Handle bulk delete
   */
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
      const deletePromises = Array.from(selectedIds).map((id) =>
        fetch(`/api/keyboards/${id}`, { method: "DELETE" })
      );

      const results = await Promise.allSettled(deletePromises);

      // Check for errors
      const errors = results.filter(
        (r) => r.status === "rejected" || !r.value.ok
      );

      if (errors.length > 0) {
        setError(
          `Failed to delete ${errors.length} keyboard(s). Please try again.`
        );
      } else {
        setSelectedIds(new Set());
        await fetchKeyboards();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete keyboards"
      );
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  /**
   * Handle bulk hide/show
   */
  const handleBulkToggleHidden = async (hidden: boolean) => {
    if (selectedIds.size === 0) return;

    setIsBulkActionLoading(true);
    setError(null);

    try {
      const updatePromises = Array.from(selectedIds).map((id) =>
        fetch(`/api/keyboards/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hidden }),
        })
      );

      const results = await Promise.allSettled(updatePromises);

      // Check for errors
      const errors = results.filter(
        (r) => r.status === "rejected" || !r.value.ok
      );

      if (errors.length > 0) {
        setError(
          `Failed to ${hidden ? "hide" : "show"} ${
            errors.length
          } keyboard(s). Please try again.`
        );
      } else {
        setSelectedIds(new Set());
        await fetchKeyboards();
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

  /**
   * Handle single delete
   */
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
      const response = await fetch(`/api/keyboards/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data: ApiResponse<void> = await response.json();
        setError(data.error?.message || "Failed to delete keyboard");
        return;
      }

      await fetchKeyboards();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete keyboard"
      );
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  /**
   * Handle single toggle hidden
   */
  const handleToggleHidden = async (id: string, currentHidden: boolean) => {
    setIsBulkActionLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/keyboards/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidden: !currentHidden }),
      });

      if (!response.ok) {
        const data: ApiResponse<KeyboardDTO> = await response.json();
        setError(data.error?.message || "Failed to update keyboard");
        return;
      }

      await fetchKeyboards();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update keyboard"
      );
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Filters and Search */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Search */}
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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or title..."
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Hidden Filter */}
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
                hiddenFilter === undefined
                  ? "all"
                  : hiddenFilter
                  ? "true"
                  : "false"
              }
              onChange={(e) => {
                const value = e.target.value;
                setHiddenFilter(
                  value === "all" ? undefined : value === "true" ? true : false
                );
              }}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All</option>
              <option value="true">Hidden</option>
              <option value="false">Visible</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-700 dark:bg-red-900/20">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
              {selectedIds.size} keyboard(s) selected
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleBulkToggleHidden(true)}
                disabled={isBulkActionLoading}
                className="rounded-md border border-blue-300 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:border-blue-600 dark:bg-gray-700 dark:text-blue-300 dark:hover:bg-gray-600"
              >
                Hide
              </button>
              <button
                onClick={() => handleBulkToggleHidden(false)}
                disabled={isBulkActionLoading}
                className="rounded-md border border-blue-300 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:border-blue-600 dark:bg-gray-700 dark:text-blue-300 dark:hover:bg-gray-600"
              >
                Show
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={isBulkActionLoading}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-red-700 dark:hover:bg-red-800"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow dark:border-gray-700 dark:bg-gray-800">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            Loading...
          </div>
        ) : sortedKeyboards.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No keyboards found.
          </div>
        ) : (
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
                      {sortField === "humanReadableName" && (
                        <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                      )}
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
                    Hidden
                  </th>
                  <th
                    scope="col"
                    className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                    onClick={() => handleSort("createdAt")}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Created</span>
                      {sortField === "createdAt" && (
                        <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                      )}
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
                            handleDelete(
                              keyboard.id,
                              keyboard.humanReadableName
                            )
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
        )}

        {/* Pagination */}
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

export default KeyboardsList;
