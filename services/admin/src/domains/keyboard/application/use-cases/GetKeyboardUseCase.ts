/**
 * Get Keyboard Use Case Implementation
 *
 * Implements the GetKeyboardUseCase interface.
 * This use case retrieves a Keyboard entity by ID from the repository.
 */

import { GetKeyboardUseCase } from "../../ports/in/GetKeyboardUseCase";
import { KeyboardDTO } from "../dto/KeyboardDTO";
import { KeyboardRepository } from "../../ports/out/KeyboardRepository";

/**
 * Get Keyboard Use Case Implementation
 *
 * Handles the retrieval of Keyboard entities by ID.
 */
export class GetKeyboardUseCaseImpl implements GetKeyboardUseCase {
  constructor(private readonly keyboardRepository: KeyboardRepository) {}

  /**
   * Execute the get keyboard use case
   *
   * @param id - Keyboard ID to retrieve
   * @returns Promise resolving to the KeyboardDTO
   * @throws Error if keyboard not found
   */
  async execute(id: string): Promise<KeyboardDTO> {
    // Get keyboard from repository by ID
    const keyboard = await this.keyboardRepository.findById(id);

    if (!keyboard) {
      throw new Error(`Keyboard with ID ${id} not found`);
    }

    // Convert to DTO
    return KeyboardDTO.fromEntity(keyboard);
  }
}

