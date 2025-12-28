"use client";

/**
 * StepsTable Component
 *
 * Table component for displaying steps with selection, actions, and pagination.
 */

import Link from "next/link";
import type { StepDTO } from "@/domains/step/application/dto/StepDTO";
import Pagination from "@/components/common/Pagination";

interface StepsTableProps {
  steps: StepDTO[];
  isLoading: boolean;
  selectedIds: Set<string>;
  isBulkActionLoading: boolean;
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onSelectAll: (checked: boolean) => void;
  onSelect: (id: string, checked: boolean) => void;
  onToggleHidden: (id: string, currentHidden: boolean) => void;
  onDelete: (id: string, name: string) => void;
  onPageChange: (page: number) => void;
}

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

const StepsTable = ({
  steps,
  isLoading,
  selectedIds,
  isBulkActionLoading,
  page,
  totalPages,
  total,
  limit,
  onSelectAll,
  onSelect,
  onToggleHidden,
  onDelete,
  onPageChange,
}: StepsTableProps) => {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow dark:border-gray-700 dark:bg-gray-800">
      {isLoading ? (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          Loading...
        </div>
      ) : steps.length === 0 ? (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          No steps found.
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
                      steps.length > 0 && selectedIds.size === steps.length
                    }
                    onChange={(e) => onSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
                  />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  Triggers
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  Messages
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  Keyboard
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  Hidden
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  Created
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
              {steps.map((step) => (
                <tr
                  key={step.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(step.id)}
                      onChange={(e) => onSelect(step.id, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/steps/${step.id}/edit`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      {step.humanReadableName}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {step.trigger.map((trigger, index) => (
                        <span
                          key={index}
                          className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        >
                          {trigger}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {step.content.length} message
                      {step.content.length !== 1 ? "s" : ""}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {step.keyboard ? (
                      <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800 dark:bg-green-900 dark:text-green-200">
                        Assigned
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        —
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {step.hidden ? (
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
                    {formatDate(step.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <Link
                        href={`/steps/${step.id}/edit`}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => onToggleHidden(step.id, step.hidden)}
                        disabled={isBulkActionLoading}
                        className="text-gray-600 hover:text-gray-900 disabled:opacity-50 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        {step.hidden ? "Show" : "Hide"}
                      </button>
                      <button
                        onClick={() =>
                          onDelete(step.id, step.humanReadableName)
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
        onPageChange={onPageChange}
      />
    </div>
  );
};

export default StepsTable;
