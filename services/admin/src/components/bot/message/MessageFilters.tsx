"use client";

/**
 * MessageFilters Component
 *
 * Search and filter controls for messages (search, type filter, hidden filter).
 */

import type { MessageType } from "@/domains/message/types";

interface MessageFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  typeFilter: MessageType | undefined;
  onTypeFilterChange: (value: MessageType | undefined) => void;
  hiddenFilter: boolean | undefined;
  onHiddenFilterChange: (value: boolean | undefined) => void;
  messageTypes: MessageType[];
}

const MessageFilters = ({
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  hiddenFilter,
  onHiddenFilterChange,
  messageTypes,
}: MessageFiltersProps) => {
  return (
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
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name..."
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Type Filter */}
        <div>
          <label
            htmlFor="typeFilter"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Type
          </label>
          <select
            id="typeFilter"
            value={typeFilter || "all"}
            onChange={(e) => {
              const value = e.target.value;
              onTypeFilterChange(
                value === "all" ? undefined : (value as MessageType)
              );
            }}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Types</option>
            {messageTypes.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
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
              onHiddenFilterChange(
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
  );
};

export default MessageFilters;





