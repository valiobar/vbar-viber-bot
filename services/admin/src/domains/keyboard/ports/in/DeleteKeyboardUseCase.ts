/**
 * Delete Keyboard Use Case Interface
 *
 * Input port interface for deleting a Keyboard.
 * This follows Hexagonal Architecture principles.
 */

/**
 * Delete Keyboard Use Case Interface
 *
 * Defines the contract for deleting a Keyboard.
 * Use case implementations will implement this interface.
 */
export interface DeleteKeyboardUseCase {
  /**
   * Execute the delete keyboard use case
   *
   * @param id - Keyboard ID to delete
   * @returns Promise resolving to void on success
   * @throws Error if keyboard not found, deletion fails, or keyboard is in use
   */
  execute(id: string): Promise<void>;
}





