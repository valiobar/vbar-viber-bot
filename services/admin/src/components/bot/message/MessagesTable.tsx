"use client";

/**
 * MessagesTable Component
 *
 * Table component for displaying messages with sorting, selection, and pagination.
 */

import Link from "next/link";
import type { MessageDTO } from "@/domains/message/application/dto/MessageDTO";
import Pagination from "@/components/common/Pagination";

export type SortField = "humanReadableName" | "type" | "createdAt";
export type SortDirection = "asc" | "desc";

interface MessagesTableProps {
  /**
   * Array of messages to display (should be pre-sorted)
   */
  messages: MessageDTO[];
  /**
   * Loading state
   */
  isLoading: boolean;
  /**
   * Set of selected message IDs
   */
  selectedIds: Set<string>;
  /**
   * Current sort field
   */
  sortField: SortField;
  /**
   * Current sort direction
   */
  sortDirection: SortDirection;
  /**
   * Current page number
   */
  page: number;
  /**
   * Total number of pages
   */
  totalPages: number;
  /**
   * Total number of messages
   */
  total: number;
  /**
   * Items per page
   */
  limit: number;
  /**
   * Bulk action loading state
   */
  isBulkActionLoading: boolean;
  /**
   * Sort handler
   */
  onSort: (field: SortField) => void;
  /**
   * Select all handler
   */
  onSelectAll: (checked: boolean) => void;
  /**
   * Individual select handler
   */
  onSelect: (id: string, checked: boolean) => void;
  /**
   * Toggle hidden handler
   */
  onToggleHidden: (id: string, currentHidden: boolean) => void;
  /**
   * Delete handler
   */
  onDelete: (id: string, name: string) => void;
  /**
   * Page change handler
   */
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

/**
 * Get preview text for message content
 */
const getContentPreview = (message: MessageDTO): string => {
  if (message.type === "text" && "text" in message.content) {
    const text = (message.content as any).text;
    return text && typeof text === "string"
      ? text.substring(0, 50) + (text.length > 50 ? "..." : "")
      : "—";
  }
  if (message.type === "url") {
    return message.url || "—";
  }
  if (message.type === "picture" && "media" in message.content) {
    return `Picture: ${(message.content as any).media}`;
  }
  if (message.type === "video" && "media" in message.content) {
    return `Video: ${(message.content as any).media}`;
  }
  if (message.type === "file" && "media" in message.content) {
    return `File: ${
      (message.content as any).file_name || (message.content as any).media
    }`;
  }
  if (message.type === "location" && "lat" in message.content) {
    const content = message.content as any;
    return `Location: ${content.lat}, ${content.lon}`;
  }
  if (message.type === "contact" && "name" in message.content) {
    const content = message.content as any;
    return `Contact: ${content.name} (${content.phone_number})`;
  }
  if (message.type === "sticker" && "sticker_id" in message.content) {
    return `Sticker: ${(message.content as any).sticker_id}`;
  }
  if (message.type === "keyboard") {
    return "Keyboard message";
  }
  if (message.type === "rich-media") {
    return "Rich media carousel";
  }
  return "—";
};

const MessagesTable = ({
  messages,
  isLoading,
  selectedIds,
  sortField,
  sortDirection,
  page,
  totalPages,
  total,
  limit,
  isBulkActionLoading,
  onSort,
  onSelectAll,
  onSelect,
  onToggleHidden,
  onDelete,
  onPageChange,
}: MessagesTableProps) => {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow dark:border-gray-700 dark:bg-gray-800">
      {isLoading ? (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          Loading...
        </div>
      ) : messages.length === 0 ? (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          No messages found.
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
                      messages.length > 0 &&
                      selectedIds.size === messages.length
                    }
                    onChange={(e) => onSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
                  />
                </th>
                <th
                  scope="col"
                  className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                  onClick={() => onSort("humanReadableName")}
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
                  className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                  onClick={() => onSort("type")}
                >
                  <div className="flex items-center space-x-1">
                    <span>Type</span>
                    {sortField === "type" && (
                      <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  Preview
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
                  onClick={() => onSort("createdAt")}
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
              {messages.map((message) => (
                <tr
                  key={message.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(message.id)}
                      onChange={(e) => onSelect(message.id, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/messages/${message.id}/edit`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      {message.humanReadableName}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {message.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-xs truncate text-sm text-gray-900 dark:text-white">
                      {getContentPreview(message)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {message.hidden ? (
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
                    {formatDate(message.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <Link
                        href={`/messages/${message.id}/edit`}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() =>
                          onToggleHidden(message.id, message.hidden)
                        }
                        disabled={isBulkActionLoading}
                        className="text-gray-600 hover:text-gray-900 disabled:opacity-50 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        {message.hidden ? "Show" : "Hide"}
                      </button>
                      <button
                        onClick={() =>
                          onDelete(message.id, message.humanReadableName)
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

export default MessagesTable;
