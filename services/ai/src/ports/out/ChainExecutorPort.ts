import { AITask, ConversationContext } from "../../domains/ai/entities";

/**
 * Port interface for LangChain chain execution
 * This is an outbound port that defines the contract for executing different types of chains
 */
export interface ChainExecutorPort {
  /**
   * Execute a simple prompt chain (direct prompt to AI model)
   * @param prompt - The prompt to execute
   * @param context - Optional conversation context for maintaining conversation history
   * @returns Promise resolving to the AI-generated response
   */
  executeSimpleChain(
    prompt: string,
    context?: ConversationContext
  ): Promise<string>;

  /**
   * Execute a RAG chain with retrieval from vector store
   * @param query - The search query
   * @param context - Optional conversation context for maintaining conversation history
   * @returns Promise resolving to the AI-generated response with retrieved context
   */
  executeRAGChain(
    query: string,
    context?: ConversationContext
  ): Promise<string>;

  /**
   * Execute a custom chain from a template
   * @param templateName - The name of the template to use
   * @param variables - Variables to inject into the template
   * @param context - Optional conversation context for maintaining conversation history
   * @returns Promise resolving to the AI-generated response
   */
  executeCustomChain(
    templateName: string,
    variables: Record<string, string>,
    context?: ConversationContext
  ): Promise<string>;

  /**
   * Execute a task based on task type
   * @param task - The AI task to execute
   * @param input - The input string for the task
   * @param context - Optional conversation context for maintaining conversation history
   * @returns Promise resolving to the AI-generated response
   */
  executeTask(
    task: AITask,
    input: string,
    context?: ConversationContext
  ): Promise<string>;
}




