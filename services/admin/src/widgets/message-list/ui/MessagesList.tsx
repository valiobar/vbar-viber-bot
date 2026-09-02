"use client";

/**
 * Messages list widget
 *
 * Composes entity table + feature filters/bulk actions with shared list state.
 */

import { useCallback, useState } from "react";
import Link from "next/link";
import { ErrorMessage, useResourceList } from "@/shared";
import {
  MessagesTable,
  deleteMessage,
  listMessages,
  updateMessage,
  type ListMessagesResult,
  type MessageDTO,
  type MessageType,
  type SortDirection,
  type SortField,
} from "@/entities/message";
import { BulkActions, MessageFilters } from "@/features/message-manage";

interface MessagesListProps {
  initialData?: ListMessagesResult;
}

type MessageListFilters = {
  search: string;
  hidden?: boolean;
  type?: MessageType;
};

const MESSAGE_TYPES: MessageType[] = [
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

export const MessagesList = ({ initialData }: MessagesListProps) => {
  const fetcher = useCallback(
    async (
      filters: MessageListFilters,
      pagination: { page: number; limit: number }
    ) => {
      const result = await listMessages(
        {
          search: filters.search.trim() || undefined,
          hidden: filters.hidden,
          type: filters.type,
        },
        pagination
      );
      return {
        items: result.messages,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      };
    },
    []
  );

  const {
    items: messages,
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
  } = useResourceList<MessageDTO, MessageListFilters>({
    fetcher,
    initialData: initialData
      ? {
          items: initialData.messages,
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

  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

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
    }
    return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(sortedMessages.map((m) => m.id)));
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
        `Are you sure you want to delete ${selectedIds.size} message(s)? This action cannot be undone.`
      )
    ) {
      return;
    }

    setIsBulkActionLoading(true);
    setError(null);

    try {
      const results = await Promise.allSettled(
        Array.from(selectedIds).map((id) => deleteMessage(id))
      );
      const errors = results.filter((r) => r.status === "rejected");

      if (errors.length > 0) {
        setError(
          `Failed to delete ${errors.length} message(s). Please try again.`
        );
      } else {
        setSelectedIds(new Set());
        await refetch();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete messages"
      );
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
        Array.from(selectedIds).map((id) => updateMessage(id, { hidden }))
      );
      const errors = results.filter((r) => r.status === "rejected");

      if (errors.length > 0) {
        setError(
          `Failed to ${hidden ? "hide" : "show"} ${
            errors.length
          } message(s). Please try again.`
        );
      } else {
        setSelectedIds(new Set());
        await refetch();
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
      await deleteMessage(id);
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete message");
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleToggleHidden = async (id: string, currentHidden: boolean) => {
    setIsBulkActionLoading(true);
    setError(null);

    try {
      await updateMessage(id, { hidden: !currentHidden });
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update message");
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
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

      <MessageFilters
        search={filters.search}
        onSearchChange={(search) => setFilters((prev) => ({ ...prev, search }))}
        typeFilter={filters.type}
        onTypeFilterChange={(type) => setFilters((prev) => ({ ...prev, type }))}
        hiddenFilter={filters.hidden}
        onHiddenFilterChange={(hidden) =>
          setFilters((prev) => ({ ...prev, hidden }))
        }
        messageTypes={MESSAGE_TYPES}
      />

      <ErrorMessage error={error} />

      <BulkActions
        selectedCount={selectedIds.size}
        isLoading={isBulkActionLoading}
        onHide={() => handleBulkToggleHidden(true)}
        onShow={() => handleBulkToggleHidden(false)}
        onDelete={handleBulkDelete}
      />

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
