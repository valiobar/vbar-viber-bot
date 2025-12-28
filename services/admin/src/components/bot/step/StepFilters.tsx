"use client";

/**
 * StepFilters Component
 *
 * Filter and search controls for the steps list.
 */

interface StepFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  hiddenFilter: boolean | undefined;
  onHiddenFilterChange: (value: boolean | undefined) => void;
}

const StepFilters = ({
  search,
  onSearchChange,
  hiddenFilter,
  onHiddenFilterChange,
}: StepFiltersProps) => {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Search */}
        <div>
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

export default StepFilters;
