"use client";

import { useState } from "react";
import type { PromptDTO, PromptTaskType } from "@/entities/prompt";

type PromptsListProps = {
  prompts: PromptDTO[];
  loading: boolean;
  onEdit: (prompt: PromptDTO) => void;
  onActivate: (prompt: PromptDTO) => Promise<void>;
  onDelete: (name: string) => Promise<void>;
};

const taskTypeBadgeClass = (taskType: PromptTaskType): string => {
  if (taskType === "rag") {
    return "inline-flex rounded-full bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-800 dark:bg-purple-900 dark:text-purple-200";
  }
  if (taskType === "custom") {
    return "inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800 dark:bg-gray-700 dark:text-gray-200";
  }
  return "inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-900 dark:text-blue-200";
};

export const PromptsList = ({
  prompts,
  loading,
  onEdit,
  onActivate,
  onDelete,
}: PromptsListProps) => {
  const [confirmingName, setConfirmingName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setConfirmingName(null);
      setBusy(false);
    }
  };

  const handleStartDelete = (name: string) => {
    setConfirmingName(name);
  };

  if (loading) {
    return (
      <div
        className="flex items-center justify-center py-12"
        data-testid="prompts-loading"
      >
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" />
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  if (prompts.length === 0) {
    return (
      <p
        data-testid="prompts-empty"
        className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
      >
        No prompts yet
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow dark:border-gray-700 dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table
            data-testid="prompts-table"
            className="min-w-full divide-y divide-gray-200 dark:divide-gray-700"
          >
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
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
                  Type
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  Active
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  Variables
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  Updated
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
              {prompts.map((prompt) => (
                <tr key={prompt.name} data-testid="prompt-row">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {prompt.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={taskTypeBadgeClass(prompt.taskType)}>
                      {prompt.taskType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {prompt.isActive ? (
                      <span
                        data-testid="prompt-active-badge"
                        className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800 dark:bg-green-900 dark:text-green-200"
                      >
                        Active
                      </span>
                    ) : null}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {prompt.variables.join(", ") || "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(prompt.updatedAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(prompt)}
                        disabled={busy}
                        aria-label={`Edit ${prompt.name}`}
                        data-testid="prompt-edit"
                        className="rounded-md px-3 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                      >
                        Edit
                      </button>
                      {!prompt.isActive && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void run(() => onActivate(prompt))}
                          aria-label={`Activate ${prompt.name}`}
                          data-testid="prompt-activate"
                          className="rounded-md px-3 py-1.5 text-sm font-medium text-green-600 transition-colors hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 dark:text-green-400 dark:hover:bg-green-900/20"
                        >
                          Activate
                        </button>
                      )}
                      {confirmingName === prompt.name ? (
                        <button
                          type="button"
                          onClick={() => void run(() => onDelete(prompt.name))}
                          disabled={busy}
                          data-testid="prompt-delete-confirm"
                          aria-label={`Confirm delete ${prompt.name}`}
                          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-red-700 dark:hover:bg-red-800"
                        >
                          Confirm?
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStartDelete(prompt.name)}
                          disabled={busy}
                          data-testid="prompt-delete"
                          aria-label={`Delete ${prompt.name}`}
                          className="rounded-md px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
