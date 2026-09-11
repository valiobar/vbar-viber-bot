// Mirrored from services/ai/src/ports/in/ManagePromptsUseCase.ts
export type PromptTaskType = "simple" | "rag" | "custom";

export interface PromptDTO {
  name: string;
  template: string;
  taskType: PromptTaskType;
  variables: string[];
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePromptInput {
  name: string;
  template: string;
  taskType: PromptTaskType;
  description?: string;
  isActive?: boolean;
}

export interface UpdatePromptInput {
  template?: string;
  taskType?: PromptTaskType;
  description?: string;
  isActive?: boolean;
}
