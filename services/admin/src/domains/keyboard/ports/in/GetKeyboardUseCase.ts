/**
 * Get Keyboard Use Case Interface
 *
 * Input port interface for retrieving a Keyboard by ID.
 * This follows Hexagonal Architecture principles.
 */

import { KeyboardDTO } from "../../application/dto/KeyboardDTO";

/**
 * Get Keyboard Use Case Interface
 *
 * Defines the contract for retrieving a Keyboard by ID.
 * Use case implementations will implement this interface.
 */
export interface GetKeyboardUseCase {
  /**
   * Execute the get keyboard use case
   *
   * @param id - Keyboard ID to retrieve
   * @returns Promise resolving to the KeyboardDTO
   * @throws Error if keyboard not found
   */
  execute(id: string): Promise<KeyboardDTO>;
}



