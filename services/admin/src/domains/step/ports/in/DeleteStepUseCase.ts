/**
 * Delete Step Use Case Interface
 *
 * Input port interface for deleting a Step.
 * This follows Hexagonal Architecture principles.
 */

/**
 * Delete Step Use Case Interface
 *
 * Defines the contract for deleting a Step.
 * Use case implementations will implement this interface.
 */
export interface DeleteStepUseCase {
  /**
   * Execute the delete step use case
   *
   * @param id - Step ID to delete
   * @returns Promise resolving to void on success
   * @throws Error if step not found, deletion fails, or step is in use
   */
  execute(id: string): Promise<void>;
}

