/**
 * Delete Message Use Case Interface
 *
 * Input port interface for deleting a Message.
 * This follows Hexagonal Architecture principles.
 */

/**
 * Delete Message Use Case Interface
 *
 * Defines the contract for deleting a Message.
 * Use case implementations will implement this interface.
 */
export interface DeleteMessageUseCase {
  /**
   * Execute the delete message use case
   *
   * @param id - Message ID to delete
   * @returns Promise resolving to void on success
   * @throws Error if message not found, deletion fails, or message is in use
   */
  execute(id: string): Promise<void>;
}

