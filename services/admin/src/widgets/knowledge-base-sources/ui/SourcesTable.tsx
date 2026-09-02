"use client";

import { useState } from "react";
import type { KnowledgeSource } from "@/entities/knowledge-base";

type SourcesTableProps = {
  sources: KnowledgeSource[];
  loading: boolean;
  onDelete: (id: string) => Promise<void>;
  onClearAll: () => Promise<void>;
};

export const SourcesTable = ({
  sources,
  loading,
  onDelete,
  onClearAll,
}: SourcesTableProps) => {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmingClearAll, setConfirmingClearAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await onDelete(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setConfirmingId(null);
      setBusy(false);
    }
  };

  const handleClearAll = async () => {
    setBusy(true);
    setError(null);
    try {
      await onClearAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Clear all failed");
    } finally {
      setConfirmingClearAll(false);
      setBusy(false);
    }
  };

  const handleStartDelete = (id: string) => {
    setConfirmingClearAll(false);
    setConfirmingId(id);
  };

  const handleStartClearAll = () => {
    setConfirmingId(null);
    setConfirmingClearAll(true);
  };

  if (loading) {
    return (
      <div
        className="flex items-center justify-center py-12"
        data-testid="sources-loading"
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

  if (sources.length === 0) {
    return (
      <p
        data-testid="sources-empty"
        className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
      >
        No sources ingested yet
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow dark:border-gray-700 dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table
            data-testid="sources-table"
            className="min-w-full divide-y divide-gray-200 dark:divide-gray-700"
          >
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  Source
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
                  Chunks
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  Ingested
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
              {sources.map((source) => (
                <tr key={source.sourceId} data-testid="source-row">
                  <td
                    className="max-w-xs truncate px-6 py-4 text-sm text-gray-900 dark:text-white"
                    title={source.source}
                  >
                    {source.source}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={
                        source.sourceType === "url"
                          ? "inline-flex rounded-full bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                          : "inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                      }
                    >
                      {source.sourceType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {source.chunkCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(source.ingestedAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {confirmingId === source.sourceId ? (
                      <button
                        type="button"
                        onClick={() => handleDelete(source.sourceId)}
                        disabled={busy}
                        data-testid="source-delete-confirm"
                        aria-label={`Confirm delete ${source.source}`}
                        className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-red-700 dark:hover:bg-red-800"
                      >
                        Confirm?
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStartDelete(source.sourceId)}
                        disabled={busy}
                        data-testid="source-delete"
                        aria-label={`Delete ${source.source}`}
                        className="rounded-md px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {confirmingClearAll ? (
        <button
          type="button"
          onClick={handleClearAll}
          disabled={busy}
          data-testid="sources-clear-all-confirm"
          aria-label="Confirm clear all sources"
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-red-700 dark:hover:bg-red-800"
        >
          Confirm clear all?
        </button>
      ) : (
        <button
          type="button"
          onClick={handleStartClearAll}
          disabled={busy}
          data-testid="sources-clear-all"
          aria-label="Clear all sources"
          className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          Clear all
        </button>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
