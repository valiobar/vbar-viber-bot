import { AITaskType } from "../value-objects/AITaskType";

/**
 * AI Task domain entity
 * Represents a task to be executed by the AI service
 */
export class AITask {
  public readonly taskType: AITaskType;
  public readonly promptTemplateName?: string;
  public readonly ragEnabled: boolean;
  public readonly metadata?: Record<string, any>;

  constructor(
    taskType: AITaskType,
    ragEnabled: boolean = false,
    promptTemplateName?: string,
    metadata?: Record<string, any>
  ) {
    // Validate required fields
    if (!taskType) {
      throw new Error("Task type is required");
    }

    this.taskType = taskType;
    this.ragEnabled = ragEnabled;
    this.promptTemplateName = promptTemplateName;
    this.metadata = metadata;
  }

  /**
   * Check if this task uses RAG (Retrieval Augmented Generation)
   * @returns true if task type is RAG or RAG is enabled
   */
  public isRAGTask(): boolean {
    return this.taskType === AITaskType.RAG || this.ragEnabled;
  }
}

