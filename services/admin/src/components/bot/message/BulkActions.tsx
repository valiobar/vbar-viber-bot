"use client";

/**
 * BulkActions Component
 *
 * Displays bulk action buttons when messages are selected (Hide, Show, Delete).
 */

interface BulkActionsProps {
  selectedCount: number;
  isLoading: boolean;
  onHide: () => void;
  onShow: () => void;
  onDelete: () => void;
}

const BulkActions = ({
  selectedCount,
  isLoading,
  onHide,
  onShow,
  onDelete,
}: BulkActionsProps) => {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
          {selectedCount} message(s) selected
        </span>
        <div className="flex items-center space-x-2">
          <button
            onClick={onHide}
            disabled={isLoading}
            className="rounded-md border border-blue-300 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:border-blue-600 dark:bg-gray-700 dark:text-blue-300 dark:hover:bg-gray-600"
          >
            Hide
          </button>
          <button
            onClick={onShow}
            disabled={isLoading}
            className="rounded-md border border-blue-300 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:border-blue-600 dark:bg-gray-700 dark:text-blue-300 dark:hover:bg-gray-600"
          >
            Show
          </button>
          <button
            onClick={onDelete}
            disabled={isLoading}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-red-700 dark:hover:bg-red-800"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkActions;



