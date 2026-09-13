"use client";

/**
 * Step usage stats widget
 *
 * Date-range filter, CSS daily-activity bars, and per-step totals table.
 * Accepts SSR `initialData` (last 30 days by default).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ErrorMessage } from "@/shared";
import {
  getStepUsageStats,
  type StepUsageStatsResult,
  type StepUsageTotal,
} from "@/entities/analytics";

interface StepUsageStatsProps {
  initialData?: StepUsageStatsResult;
}

const formatLastUsed = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const SOURCE_LABEL: Record<string, string> = {
  welcome: "Welcome",
  subscribe: "Subscribe",
};

const formatTrigger = (row: StepUsageTotal) => {
  if (row.triggers.length > 0) {
    return row.triggers.join(", ");
  }

  const sourceLabels = row.sources
    .filter((source) => source !== "trigger")
    .map((source) => SOURCE_LABEL[source] ?? source);

  return sourceLabels.length > 0 ? sourceLabels.join(", ") : "—";
};

export const StepUsageStats = ({ initialData }: StepUsageStatsProps) => {
  const [data, setData] = useState<StepUsageStatsResult | null>(
    initialData ?? null
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLoad = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setData(
        await getStepUsageStats({
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        })
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load stats");
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  const didRecoverSsr = useRef(false);

  // Server-side `http()` cannot attach the session cookie, so SSR often
  // arrives without initialData. Load the default range on the client.
  useEffect(() => {
    if (initialData || didRecoverSsr.current) {
      return;
    }
    didRecoverSsr.current = true;
    void handleLoad();
  }, [initialData, handleLoad]);

  const maxDaily = Math.max(1, ...(data?.daily.map((d) => d.count) ?? [1]));

  return (
    <div className="space-y-6" data-testid="step-usage-stats">
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col items-end gap-4 sm:flex-row">
          <div className="w-full sm:w-auto">
            <label
              htmlFor="analytics-start-date"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Start date
            </label>
            <input
              type="date"
              id="analytics-start-date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              aria-label="Start date"
              data-testid="analytics-start-date"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="w-full sm:w-auto">
            <label
              htmlFor="analytics-end-date"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              End date
            </label>
            <input
              type="date"
              id="analytics-end-date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              aria-label="End date"
              data-testid="analytics-end-date"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              void handleLoad();
            }}
            disabled={isLoading}
            aria-label="Apply date range"
            data-testid="analytics-apply"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-blue-700 dark:hover:bg-blue-800"
          >
            {isLoading ? "Loading…" : "Apply"}
          </button>
        </div>
      </div>

      <ErrorMessage error={error} />

      {isLoading && !data && (
        <p className="text-gray-500 dark:text-gray-400">Loading…</p>
      )}

      {!data && !error && !isLoading && (
        <p className="text-gray-500 dark:text-gray-400">
          Click Apply to load step usage statistics.
        </p>
      )}

      {data?.totals.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400">
          No step usage recorded in this period.
        </p>
      )}

      {data && data.daily.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white p-4 shadow dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
            Daily activity
          </h2>
          <div
            className="flex h-24 items-end gap-1"
            data-testid="analytics-daily-bars"
            role="img"
            aria-label="Daily step usage counts"
          >
            {data.daily.map((d) => (
              <div
                key={d.date}
                title={`${d.date}: ${d.count}`}
                aria-label={`${d.date}: ${d.count}`}
                className="min-h-[0.25rem] flex-1 rounded-t bg-blue-500 dark:bg-blue-400"
                style={{ height: `${(d.count / maxDaily) * 100}%` }}
              />
            ))}
          </div>
        </div>
      )}

      {data && data.totals.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow dark:border-gray-700 dark:bg-gray-800">
          <div className="overflow-x-auto">
            <table
              className="min-w-full divide-y divide-gray-200 dark:divide-gray-700"
              data-testid="analytics-table"
            >
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                  >
                    Step
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                  >
                    Trigger
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                  >
                    Executions
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                  >
                    Unique users
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                  >
                    Last used
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                {data.totals.map((row) => (
                  <tr
                    key={row.stepId}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {row.stepName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {formatTrigger(row)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {row.total}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {row.uniqueUsers}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatLastUsed(row.lastUsedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
