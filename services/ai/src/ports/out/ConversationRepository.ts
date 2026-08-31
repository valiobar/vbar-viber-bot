import { ConversationContext } from "../../domains/ai/entities";

/**
 * Port interface for conversation history storage
 * This is an outbound port that defines the contract for persisting conversation data
 */
export interface ConversationRepository {
  /**
   * Get conversation history for a user
   * @param userId - The unique identifier of the user
   * @returns Promise resolving to conversation context or null if no history exists
   */
  getConversationHistory(userId: string): Promise<ConversationContext | null>;

  /**
   * Save a message to the conversation history
   * @param userId - The unique identifier of the user
   * @param role - The role of the message sender (user or assistant)
   * @param content - The content of the message
   * @returns Promise that resolves when the message is saved
   */
  saveMessage(
    userId: string,
    role: "user" | "assistant",
    content: string
  ): Promise<void>;

  /**
   * Clear conversation history for a user
   * @param userId - The unique identifier of the user
   * @returns Promise that resolves when the history is cleared
   */
  clearConversationHistory(userId: string): Promise<void>;
}




