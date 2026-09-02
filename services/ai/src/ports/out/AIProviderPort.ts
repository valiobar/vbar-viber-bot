import { AIProvider } from "../../domains/ai/value-objects";
import { ConversationContext } from "../../domains/ai/entities";

/**
 * Port interface for AI provider implementations
 * This is an outbound port that defines the contract for AI model interactions
 */
export interface AIProviderPort {
  /**
   * Generate a response from the AI model
   * @param prompt - The prompt to send to the AI model
   * @param context - Optional conversation context for maintaining conversation history
   * @param systemPrompt - Optional system prompt to set AI behavior and context
   * @returns Promise resolving to the AI-generated response string
   */
  generateResponse(
    prompt: string,
    context?: ConversationContext,
    systemPrompt?: string
  ): Promise<string>;

  /**
   * Get the type of AI provider this implementation represents
   * @returns The AI provider type (e.g., OPENAI, ANTHROPIC, etc.)
   */
  getProviderType(): AIProvider;
}



