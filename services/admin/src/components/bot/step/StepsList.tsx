"use client";

/**
 * StepsList Component
 *
 * Table/list component for displaying steps with pagination, search, filtering,
 * and bulk actions (delete, hide/show).
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { StepDTO } from "@/domains/step/application/dto/StepDTO";
import type { ListStepsResult } from "@/domains/step/ports/in/ListStepsUseCase";
import type { ApiResponse } from "@vbar/shared";
import ErrorMessage from "@/components/bot/message/ErrorMessage";
import BulkActions from "@/components/bot/message/BulkActions";
import StepFilters from "./StepFilters";
import StepsTable from "./StepsTable";

interface StepsListProps {
  /**
   * Initial data (optional, for SSR)
   */
  initialData?: ListStepsResult;
}

const StepsList = ({ initialData }: StepsListProps) => {
  // Data state
  const [steps, setSteps] = useState<StepDTO[]>(initialData?.steps || []);
  const [total, setTotal] = useState(initialData?.total || 0);
  const [page, setPage] = useState(initialData?.page || 1);
  const [limit, setLimit] = useState(initialData?.limit || 10);
  const [totalPages, setTotalPages] = useState(initialData?.totalPages || 0);

  // Filter state
  const [search, setSearch] = useState("");
  const [hiddenFilter, setHiddenFilter] = useState<boolean | undefined>(
    undefined
  );
  const [isAiFilter, setIsAiFilter] = useState<boolean | undefined>(undefined);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

  /**
   * Fetch steps from API
   */
  const fetchSteps = useCallback(async () => {
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
      if (isAiFilter !== undefined) {
        params.set("isAi", isAiFilter.toString());
      }

      const response = await fetch(`/api/steps?${params.toString()}`);
      const data: ApiResponse<ListStepsResult> = await response.json();

      if (data.error) {
        setError(data.error.message);
        return;
      }

      if (data.data) {
        setSteps(data.data.steps);
        setTotal(data.data.total);
        setPage(data.data.page);
        setLimit(data.data.limit);
        setTotalPages(data.data.totalPages);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch steps");
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, hiddenFilter, isAiFilter]);

  /**
   * Load steps on mount and when filters change
   */
  useEffect(() => {
    fetchSteps();
  }, [fetchSteps]);

  /**
   * Handle search with debounce
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page !== 1) {
        setPage(1); // Reset to first page when search changes
      } else {
        fetchSteps();
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
      fetchSteps();
    }
  }, [hiddenFilter, isAiFilter]);

  /**
   * Handle select/deselect all
   */
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(steps.map((s) => s.id)));
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
        `Are you sure you want to delete ${selectedIds.size} step(s)? This action cannot be undone.`
      )
    ) {
      return;
    }

    setIsBulkActionLoading(true);
    setError(null);

    try {
      const deletePromises = Array.from(selectedIds).map((id) =>
        fetch(`/api/steps/${id}`, { method: "DELETE" })
      );

      const results = await Promise.allSettled(deletePromises);

      // Check for errors
      const errors = results.filter(
        (r) => r.status === "rejected" || !r.value.ok
      );

      if (errors.length > 0) {
        setError(
          `Failed to delete ${errors.length} step(s). Please try again.`
        );
      } else {
        setSelectedIds(new Set());
        await fetchSteps();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete steps");
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
        fetch(`/api/steps/${id}`, {
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
          } step(s). Please try again.`
        );
      } else {
        setSelectedIds(new Set());
        await fetchSteps();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to ${hidden ? "hide" : "show"} steps`
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
      const response = await fetch(`/api/steps/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data: ApiResponse<void> = await response.json();
        setError(data.error?.message || "Failed to delete step");
        return;
      }

      await fetchSteps();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete step");
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
      const response = await fetch(`/api/steps/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidden: !currentHidden }),
      });

      if (!response.ok) {
        const data: ApiResponse<StepDTO> = await response.json();
        setError(data.error?.message || "Failed to update step");
        return;
      }

      await fetchSteps();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update step");
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Steps
        </h1>
        <Link
          href="/steps/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-800"
        >
          Create New Step
        </Link>
      </div>

      {/* Filters and Search */}
      <StepFilters
        search={search}
        onSearchChange={setSearch}
        hiddenFilter={hiddenFilter}
        onHiddenFilterChange={setHiddenFilter}
        isAiFilter={isAiFilter}
        onIsAiFilterChange={setIsAiFilter}
      />

      {/* Error Message */}
      <ErrorMessage error={error} />

      {/* Bulk Actions */}
      <BulkActions
        selectedCount={selectedIds.size}
        isLoading={isBulkActionLoading}
        onHide={() => handleBulkToggleHidden(true)}
        onShow={() => handleBulkToggleHidden(false)}
        onDelete={handleBulkDelete}
      />

      {/* Table */}
      <StepsTable
        steps={steps}
        isLoading={isLoading}
        selectedIds={selectedIds}
        isBulkActionLoading={isBulkActionLoading}
        page={page}
        totalPages={totalPages}
        total={total}
        limit={limit}
        onSelectAll={handleSelectAll}
        onSelect={handleSelect}
        onToggleHidden={handleToggleHidden}
        onDelete={handleDelete}
        onPageChange={setPage}
      />
    </div>
  );
};

export default StepsList;
