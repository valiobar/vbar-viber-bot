import { http } from "@/shared";
import type {
  CreatePromptInput,
  PromptDTO,
  PromptTaskType,
  UpdatePromptInput,
} from "../model/types";

export const listPrompts = (taskType?: PromptTaskType): Promise<PromptDTO[]> => {
  const query = taskType
    ? `?taskType=${encodeURIComponent(taskType)}`
    : "";
  return http<PromptDTO[]>(`/api/prompts${query}`);
};

export const getPrompt = (name: string): Promise<PromptDTO> =>
  http<PromptDTO>(`/api/prompts/${encodeURIComponent(name)}`);

export const createPrompt = (input: CreatePromptInput): Promise<PromptDTO> =>
  http<PromptDTO>("/api/prompts", { method: "POST", body: input });

export const updatePrompt = (
  name: string,
  input: UpdatePromptInput
): Promise<PromptDTO> =>
  http<PromptDTO>(`/api/prompts/${encodeURIComponent(name)}`, {
    method: "PUT",
    body: input,
  });

export const deletePrompt = (name: string): Promise<{ deleted: boolean }> =>
  http<{ deleted: boolean }>(`/api/prompts/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
