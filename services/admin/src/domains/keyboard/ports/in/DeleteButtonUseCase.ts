/**
 * Delete Button Use Case Interface
 *
 * Input port interface for deleting a Button from a Keyboard.
 * This follows Hexagonal Architecture principles.
 *
 * Buttons are always embedded within Keyboards, so this use case
 * removes a button at a specific index from a keyboard's buttons array.
 */

/**
 * Input data for deleting a button
 */
export interface DeleteButtonInput {
  /**
   * ID of the keyboard containing the button
   * Required
   */
  keyboardId: string;

  /**
   * Index of the button in the keyboard's buttons array
   * Required
   */
  buttonIndex: number;
}

/**
 * Delete Button Use Case Interface
 *
 * Defines the contract for deleting a Button from a Keyboard.
 * Use case implementations will implement this interface.
 */
export interface DeleteButtonUseCase {
  /**
   * Execute the delete button use case
   *
   * @param input - Input data for deleting the button (includes keyboardId and buttonIndex)
   * @returns Promise resolving to void on success
   * @throws Error if keyboard not found, button index out of bounds, or deletion fails
   */
  execute(input: DeleteButtonInput): Promise<void>;
}
