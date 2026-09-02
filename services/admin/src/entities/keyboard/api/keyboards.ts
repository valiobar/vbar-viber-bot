import { http } from "@/shared";
import type {
  CreateKeyboardInput,
  KeyboardDTO,
  ListKeyboardsFilters,
  ListKeyboardsResult,
  UpdateKeyboardInput,
} from "../model/types";

const buildListQuery = (
  filters: ListKeyboardsFilters = {},
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
  if (filters.isBroadcast !== undefined) {
    params.set("isBroadcast", String(filters.isBroadcast));
  }
  if (filters.isTemplate !== undefined) {
    params.set("isTemplate", String(filters.isTemplate));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
};

export const listKeyboards = (
  filters: ListKeyboardsFilters = {},
  pagination: { page?: number; limit?: number } = {}
): Promise<ListKeyboardsResult> =>
  http<ListKeyboardsResult>(
    `/api/keyboards${buildListQuery(filters, pagination)}`
  );

export const getKeyboard = (id: string): Promise<KeyboardDTO> =>
  http<KeyboardDTO>(`/api/keyboards/${id}`);

export const createKeyboard = (
  input: CreateKeyboardInput
): Promise<KeyboardDTO> =>
  http<KeyboardDTO>("/api/keyboards", { method: "POST", body: input });

export const updateKeyboard = (
  id: string,
  input: UpdateKeyboardInput
): Promise<KeyboardDTO> =>
  http<KeyboardDTO>(`/api/keyboards/${id}`, { method: "PUT", body: input });

export const deleteKeyboard = (id: string): Promise<void> =>
  http<void>(`/api/keyboards/${id}`, { method: "DELETE" });
