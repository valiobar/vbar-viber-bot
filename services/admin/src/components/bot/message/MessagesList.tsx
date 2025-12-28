"use client";

/**
 * MessagesList Component
 *
 * Table/list component for displaying messages with pagination, search, filtering,
 * sorting, and bulk actions (delete, hide/show).
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { MessageDTO } from "@/domains/message/application/dto/MessageDTO";
import type { ListMessagesResult } from "@/domains/message/ports/in/ListMessagesUseCase";
import type { MessageType } from "@/domains/message/types";
import type { ApiResponse } from "@vbar/shared";
import MessageFilters from "./MessageFilters";
import ErrorMessage from "./ErrorMessage";
import BulkActions from "./BulkActions";
import MessagesTable, {
  type SortField,
  type SortDirection,
} from "./MessagesTable";

interface MessagesListProps {
  /**
   * Initial data (optional, for SSR)
   */
  initialData?: ListMessagesResult;
}

const MessagesList = ({ initialData }: MessagesListProps) => {
  // Data state
  const [messages, setMessages] = useState<MessageDTO[]>(
    initialData?.messages || []
  );
  const [total, setTotal] = useState(initialData?.total || 0);
  const [page, setPage] = useState(initialData?.page || 1);
  const [limit, setLimit] = useState(initialData?.limit || 10);
  const [totalPages, setTotalPages] = useState(initialData?.totalPages || 0);

  // Filter state
  const [search, setSearch] = useState("");
  const [hiddenFilter, setHiddenFilter] = useState<boolean | undefined>(
    undefined
  );
  const [typeFilter, setTypeFilter] = useState<MessageType | undefined>(
    undefined
  );

  // Sort state
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

  /**
   * Fetch messages from API
   */
  const fetchMessages = useCallback(async () => {
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
      if (typeFilter) {
        params.set("type", typeFilter);
      }

      const response = await fetch(`/api/messages?${params.toString()}`);
      const data: ApiResponse<ListMessagesResult> = await response.json();

      if (data.error) {
        setError(data.error.message);
        return;
      }

      if (data.data) {
        setMessages(data.data.messages);
        setTotal(data.data.total);
        setPage(data.data.page);
        setLimit(data.data.limit);
        setTotalPages(data.data.totalPages);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch messages");
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, hiddenFilter, typeFilter]);

  /**
   * Load messages on mount and when filters change
   */
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  /**
   * Handle search with debounce
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page !== 1) {
        setPage(1); // Reset to first page when search changes
      } else {
        fetchMessages();
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
      fetchMessages();
    }
  }, [hiddenFilter, typeFilter]);

  /**
   * Sort messages (client-side sorting)
   */
  const sortedMessages = [...messages].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    if (sortField === "humanReadableName") {
      aValue = a.humanReadableName.toLowerCase();
      bValue = b.humanReadableName.toLowerCase();
    } else if (sortField === "type") {
      aValue = a.type;
      bValue = b.type;
    } else {
      aValue = new Date(a.createdAt).getTime();
      bValue = new Date(b.createdAt).getTime();
    }

    if (sortDirection === "asc") {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    } else {
      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
    }
  });

  /**
   * Handle sort column click
   */
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  /**
   * Handle select/deselect all
   */
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(sortedMessages.map((m) => m.id)));
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
        `Are you sure you want to delete ${selectedIds.size} message(s)? This action cannot be undone.`
      )
    ) {
      return;
    }

    setIsBulkActionLoading(true);
    setError(null);

    try {
      const deletePromises = Array.from(selectedIds).map((id) =>
        fetch(`/api/messages/${id}`, { method: "DELETE" })
      );

      const results = await Promise.allSettled(deletePromises);

      // Check for errors
      const errors = results.filter(
        (r) => r.status === "rejected" || !r.value.ok
      );

      if (errors.length > 0) {
        setError(
          `Failed to delete ${errors.length} message(s). Please try again.`
        );
      } else {
        setSelectedIds(new Set());
        await fetchMessages();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete messages"
      );
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
        fetch(`/api/messages/${id}`, {
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
          } message(s). Please try again.`
        );
      } else {
        setSelectedIds(new Set());
        await fetchMessages();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to ${hidden ? "hide" : "show"} messages`
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
      const response = await fetch(`/api/messages/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data: ApiResponse<void> = await response.json();
        setError(data.error?.message || "Failed to delete message");
        return;
      }

      await fetchMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete message");
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
      const response = await fetch(`/api/messages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidden: !currentHidden }),
      });

      if (!response.ok) {
        const data: ApiResponse<MessageDTO> = await response.json();
        setError(data.error?.message || "Failed to update message");
        return;
      }

      await fetchMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update message");
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const messageTypes: MessageType[] = [
    "text",
    "url",
    "contact",
    "picture",
    "video",
    "file",
    "location",
    "sticker",
    "rich-media",
    "keyboard",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Messages
        </h1>
        <Link
          href="/messages/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-800"
        >
          Create Message
        </Link>
      </div>

      {/* Filters and Search */}
      <MessageFilters
        search={search}
        onSearchChange={setSearch}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        hiddenFilter={hiddenFilter}
        onHiddenFilterChange={setHiddenFilter}
        messageTypes={messageTypes}
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
      <MessagesTable
        messages={sortedMessages}
        isLoading={isLoading}
        selectedIds={selectedIds}
        sortField={sortField}
        sortDirection={sortDirection}
        page={page}
        totalPages={totalPages}
        total={total}
        limit={limit}
        isBulkActionLoading={isBulkActionLoading}
        onSort={handleSort}
        onSelectAll={handleSelectAll}
        onSelect={handleSelect}
        onToggleHidden={handleToggleHidden}
        onDelete={handleDelete}
        onPageChange={setPage}
      />
    </div>
  );
};

export default MessagesList;
