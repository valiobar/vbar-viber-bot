/**
 * Update Message Use Case Interface
 *
 * Input port interface for updating an existing Message.
 * This follows Hexagonal Architecture principles.
 */

import { MessageDTO } from "../../application/dto/MessageDTO";
import { MessageType } from "../../types";

/**
 * Input data for updating an existing Message
 */
export interface UpdateMessageInput {
  /**
   * Message type
   * Optional - if not provided, type remains unchanged
   */
  type?: MessageType;

  /**
   * Message content (type-specific structure)
   * Optional - if not provided, content remains unchanged
   */
  content?: object;

  /**
   * URL for url-type messages
   * Optional - if not provided, url remains unchanged
   */
  url?: string | null;

  /**
   * Human-readable name for the message
   * Optional - if not provided, name remains unchanged
   */
  humanReadableName?: string;

  /**
   * Whether this message is hidden from lists
   * Optional - if not provided, hidden status remains unchanged
   */
  hidden?: boolean;
}

/**
 * Update Message Use Case Interface
 *
 * Defines the contract for updating an existing Message.
 * Use case implementations will implement this interface.
 */
export interface UpdateMessageUseCase {
  /**
   * Execute the update message use case
   *
   * @param id - Message ID to update
   * @param input - Input data for updating the message
   * @returns Promise resolving to the updated MessageDTO
   * @throws Error if message not found, update fails, or validation fails
   */
  execute(id: string, input: UpdateMessageInput): Promise<MessageDTO>;
}

