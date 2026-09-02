import { http } from "@/shared";
import type {
  CreateStepInput,
  ListStepsFilters,
  ListStepsResult,
  StepDTO,
  UpdateStepInput,
} from "../model/types";

const buildListQuery = (
  filters: ListStepsFilters = {},
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
  if (filters.isAi !== undefined) {
    params.set("isAi", String(filters.isAi));
  }
  if (filters.trigger) {
    params.set("trigger", filters.trigger);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
};

export const listSteps = (
  filters: ListStepsFilters = {},
  pagination: { page?: number; limit?: number } = {}
): Promise<ListStepsResult> =>
  http<ListStepsResult>(`/api/steps${buildListQuery(filters, pagination)}`);

export const getStep = (id: string): Promise<StepDTO> =>
  http<StepDTO>(`/api/steps/${id}`);

export const createStep = (input: CreateStepInput): Promise<StepDTO> =>
  http<StepDTO>("/api/steps", { method: "POST", body: input });

export const updateStep = (
  id: string,
  input: UpdateStepInput
): Promise<StepDTO> =>
  http<StepDTO>(`/api/steps/${id}`, { method: "PUT", body: input });

export const deleteStep = (id: string): Promise<void> =>
  http<void>(`/api/steps/${id}`, { method: "DELETE" });
