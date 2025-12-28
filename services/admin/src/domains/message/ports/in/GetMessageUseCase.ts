/**
 * Get Message Use Case Interface
 *
 * Input port interface for retrieving a Message by ID.
 * This follows Hexagonal Architecture principles.
 */

import { MessageDTO } from "../../application/dto/MessageDTO";

/**
 * Get Message Use Case Interface
 *
 * Defines the contract for retrieving a Message by ID.
 * Use case implementations will implement this interface.
 */
export interface GetMessageUseCase {
  /**
   * Execute the get message use case
   *
   * @param id - Message ID to retrieve
   * @returns Promise resolving to the MessageDTO
   * @throws Error if message not found
   */
  execute(id: string): Promise<MessageDTO>;
}

