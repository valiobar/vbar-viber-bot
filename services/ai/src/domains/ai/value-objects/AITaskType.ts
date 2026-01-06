/**
 * AI Task Type value object
 * Represents the different types of AI tasks that can be executed
 */
export enum AITaskType {
  SIMPLE = "simple", // Direct prompt to AI model (no RAG)
  RAG = "rag", // Retrieval Augmented Generation (uses vector store)
  CUSTOM = "custom", // Custom chain defined in prompt template
}

/**
 * Parse and validate AI task type string
 * @param value - Task type string value
 * @returns Validated AITaskType enum value
 * @throws Error if task type is not supported
 */
export function parseAITaskType(value: string): AITaskType {
  const normalized = value.toLowerCase().trim();

  switch (normalized) {
    case "simple":
      return AITaskType.SIMPLE;
    case "rag":
      return AITaskType.RAG;
    case "custom":
      return AITaskType.CUSTOM;
    default:
      throw new Error(
        `Unsupported AI task type: ${value}. Supported task types: simple, rag, custom`
      );
  }
}

