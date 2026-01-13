/**
 * Delete Keyboard Use Case Implementation
 *
 * Implements the DeleteKeyboardUseCase interface.
 * This use case deletes a Keyboard entity from the repository.
 * It checks if the keyboard exists and if it's referenced by other entities.
 */

import { DeleteKeyboardUseCase } from "../../ports/in/DeleteKeyboardUseCase";
import { KeyboardRepository } from "../../ports/out/KeyboardRepository";

/**
 * Delete Keyboard Use Case Implementation
 *
 * Handles the deletion of Keyboard entities.
 * Note: Validation for keyboard references (Steps, Settings, Carousels) should be
 * implemented when those repositories are available.
 */
export class DeleteKeyboardUseCaseImpl implements DeleteKeyboardUseCase {
  constructor(private readonly keyboardRepository: KeyboardRepository) {}

  /**
   * Execute the delete keyboard use case
   *
   * @param id - Keyboard ID to delete
   * @returns Promise resolving to void on success
   * @throws Error if keyboard not found, deletion fails, or keyboard is in use
   */
  async execute(id: string): Promise<void> {
    // Check if keyboard exists
    const keyboard = await this.keyboardRepository.findById(id);

    if (!keyboard) {
      throw new Error(`Keyboard with ID ${id} not found`);
    }

    // TODO: Check if keyboard is referenced by Steps, Settings, or Carousels
    // This requires StepRepository, SettingRepository, and CarouselRepository
    // For now, we'll proceed with deletion
    // When those repositories are available, add validation like:
    // const stepReferences = await stepRepository.findByKeyboardId(id);
    // if (stepReferences.length > 0) {
    //   throw new Error(`Keyboard is referenced by ${stepReferences.length} step(s) and cannot be deleted`);
    // }

    // Delete keyboard via KeyboardRepository
    await this.keyboardRepository.delete(id);
  }
}





