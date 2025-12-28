/**
 * Get Button Use Case Interface
 *
 * Input port interface for retrieving a Button from a Keyboard.
 * This follows Hexagonal Architecture principles.
 *
 * Buttons are always embedded within Keyboards, so this use case
 * retrieves a button at a specific index from a keyboard's buttons array.
 */

import { ButtonDTO } from "../../application/dto/ButtonDTO";

/**
 * Input data for getting a button
 */
export interface GetButtonInput {
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
 * Get Button Use Case Interface
 *
 * Defines the contract for retrieving a Button from a Keyboard.
 * Use case implementations will implement this interface.
 */
export interface GetButtonUseCase {
  /**
   * Execute the get button use case
   *
   * @param input - Input data for getting the button (includes keyboardId and buttonIndex)
   * @returns Promise resolving to the ButtonDTO
   * @throws Error if keyboard not found or button index out of bounds
   */
  execute(input: GetButtonInput): Promise<ButtonDTO>;
}
