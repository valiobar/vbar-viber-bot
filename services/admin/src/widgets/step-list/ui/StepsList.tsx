"use client";

/**
 * Steps list widget
 *
 * Composes entity table + feature filters/bulk actions with shared list state.
 */

import { useCallback, useState } from "react";
import Link from "next/link";
import { ErrorMessage, useResourceList } from "@/shared";
import {
  StepsTable,
  deleteStep,
  listSteps,
  updateStep,
  type ListStepsResult,
  type StepDTO,
} from "@/entities/step";
import { BulkActions } from "@/features/message-manage";
import { StepFilters } from "@/features/step-manage";

interface StepsListProps {
  initialData?: ListStepsResult;
}

type StepListFilters = {
  search: string;
  hidden?: boolean;
  isAi?: boolean;
};

export const StepsList = ({ initialData }: StepsListProps) => {
  const fetcher = useCallback(
    async (
      filters: StepListFilters,
      pagination: { page: number; limit: number }
    ) => {
      const result = await listSteps(
        {
          search: filters.search.trim() || undefined,
          hidden: filters.hidden,
          isAi: filters.isAi,
        },
        pagination
      );
      return {
        items: result.steps,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      };
    },
    []
  );

  const {
    items: steps,
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
  } = useResourceList<StepDTO, StepListFilters>({
    fetcher,
    initialData: initialData
      ? {
          items: initialData.steps,
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

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(steps.map((s) => s.id)));
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
        `Are you sure you want to delete ${selectedIds.size} step(s)? This action cannot be undone.`
      )
    ) {
      return;
    }

    setIsBulkActionLoading(true);
    setError(null);

    try {
      const results = await Promise.allSettled(
        Array.from(selectedIds).map((id) => deleteStep(id))
      );
      const errors = results.filter((r) => r.status === "rejected");

      if (errors.length > 0) {
        setError(
          `Failed to delete ${errors.length} step(s). Please try again.`
        );
      } else {
        setSelectedIds(new Set());
        await refetch();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete steps");
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
        Array.from(selectedIds).map((id) => updateStep(id, { hidden }))
      );
      const errors = results.filter((r) => r.status === "rejected");

      if (errors.length > 0) {
        setError(
          `Failed to ${hidden ? "hide" : "show"} ${
            errors.length
          } step(s). Please try again.`
        );
      } else {
        setSelectedIds(new Set());
        await refetch();
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
      await deleteStep(id);
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete step");
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleToggleHidden = async (id: string, currentHidden: boolean) => {
    setIsBulkActionLoading(true);
    setError(null);

    try {
      await updateStep(id, { hidden: !currentHidden });
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update step");
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
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

      <StepFilters
        search={filters.search}
        onSearchChange={(search) => setFilters((prev) => ({ ...prev, search }))}
        hiddenFilter={filters.hidden}
        onHiddenFilterChange={(hidden) =>
          setFilters((prev) => ({ ...prev, hidden }))
        }
        isAiFilter={filters.isAi}
        onIsAiFilterChange={(isAi) => setFilters((prev) => ({ ...prev, isAi }))}
      />

      <ErrorMessage error={error} />

      <BulkActions
        selectedCount={selectedIds.size}
        isLoading={isBulkActionLoading}
        onHide={() => handleBulkToggleHidden(true)}
        onShow={() => handleBulkToggleHidden(false)}
        onDelete={handleBulkDelete}
      />

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
