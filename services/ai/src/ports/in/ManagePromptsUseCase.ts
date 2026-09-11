/**
 * Port interface for prompt template management.
 * Inbound port (use case) defining the AI↔admin contract.
 * Admin mirrors these types in entities/prompt/model/types.ts.
 */

export type PromptTaskType = "simple" | "rag" | "custom";

export interface PromptDTO {
  name: string;
  template: string;
  taskType: PromptTaskType;
  variables: string[];
  description?: string;
  isActive: boolean;
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
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
  // `name` is the lookup key and is immutable after create
}

export interface ManagePromptsUseCase {
  list(taskType?: PromptTaskType): Promise<PromptDTO[]>;
  get(name: string): Promise<PromptDTO>;
  create(input: CreatePromptInput): Promise<PromptDTO>;
  update(name: string, input: UpdatePromptInput): Promise<PromptDTO>;
  delete(name: string): Promise<void>;
}
