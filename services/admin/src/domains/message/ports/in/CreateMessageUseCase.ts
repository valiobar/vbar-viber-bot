/**
 * Create Message Use Case Interface
 *
 * Input port interface for creating a new Message.
 * This follows Hexagonal Architecture principles.
 */

import { MessageDTO } from "../../application/dto/MessageDTO";
import { MessageType } from "../../types";

/**
 * Input data for creating a new Message
 */
export interface CreateMessageInput {
  /**
   * Message type
   * Required
   */
  type: MessageType;

  /**
   * Message content (type-specific structure)
   * Required - structure depends on message type
   */
  content: object;

  /**
   * URL for url-type messages
   * Required for url type, null for other types
   */
  url?: string | null;

  /**
   * Human-readable name for the message
   * Required
   */
  humanReadableName: string;

  /**
   * Whether this message is hidden from lists
   * @default false
   */
  hidden?: boolean;
}

/**
 * Create Message Use Case Interface
 *
 * Defines the contract for creating a new Message.
 * Use case implementations will implement this interface.
 */
export interface CreateMessageUseCase {
  /**
   * Execute the create message use case
   *
   * @param input - Input data for creating the message
   * @returns Promise resolving to the created MessageDTO
   * @throws Error if message creation fails or validation fails
   */
  execute(input: CreateMessageInput): Promise<MessageDTO>;
}
