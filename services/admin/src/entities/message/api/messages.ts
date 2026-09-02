import { http } from "@/shared";
import type {
  CreateMessageInput,
  ListMessagesFilters,
  ListMessagesResult,
  MessageDTO,
  UpdateMessageInput,
} from "../model/types";

const buildListQuery = (
  filters: ListMessagesFilters = {},
  pagination: { page?: number; limit?: number } = {}
): string => {
  const params = new URLSearchParams();
  if (pagination.page !== undefined) {
    params.set("page", String(pagination.page));
  }
  if (pagination.limit !== undefined) {
    params.set("limit", String(pagination.limit));
  }
  if (filters.search?.trim()) {
    params.set("search", filters.search.trim());
  }
  if (filters.hidden !== undefined) {
    params.set("hidden", String(filters.hidden));
  }
  if (filters.type) {
    params.set("type", filters.type);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
};

export const listMessages = (
  filters: ListMessagesFilters = {},
  pagination: { page?: number; limit?: number } = {}
): Promise<ListMessagesResult> =>
  http<ListMessagesResult>(`/api/messages${buildListQuery(filters, pagination)}`);

export const getMessage = (id: string): Promise<MessageDTO> =>
  http<MessageDTO>(`/api/messages/${id}`);

export const createMessage = (input: CreateMessageInput): Promise<MessageDTO> =>
  http<MessageDTO>("/api/messages", { method: "POST", body: input });

export const updateMessage = (
  id: string,
  input: UpdateMessageInput
): Promise<MessageDTO> =>
  http<MessageDTO>(`/api/messages/${id}`, { method: "PUT", body: input });

export const deleteMessage = (id: string): Promise<void> =>
  http<void>(`/api/messages/${id}`, { method: "DELETE" });
