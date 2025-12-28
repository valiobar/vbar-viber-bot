/**
 * Delete Button Use Case Implementation
 *
 * Implements the DeleteButtonUseCase interface.
 * This use case deletes a Button entity from a Keyboard and saves the keyboard.
 *
 * Buttons are always embedded within Keyboards, so this use case
 * removes a button at a specific index from a keyboard's buttons array.
 */

import {
  DeleteButtonInput,
  DeleteButtonUseCase,
} from "../../ports/in/DeleteButtonUseCase";
import { Keyboard } from "../../entities/Keyboard";
import { KeyboardRepository } from "../../ports/out/KeyboardRepository";

/**
 * Delete Button Use Case Implementation
 *
 * Handles the deletion of Button entities from Keyboards.
 */
export class DeleteButtonUseCaseImpl implements DeleteButtonUseCase {
  constructor(private readonly keyboardRepository: KeyboardRepository) {}

  /**
   * Execute the delete button use case
   *
   * @param input - Input data for deleting the button (includes keyboardId and buttonIndex)
   * @returns Promise resolving to void on success
   * @throws Error if keyboard not found, button index out of bounds, or deletion fails
   */
  async execute(input: DeleteButtonInput): Promise<void> {
    // Get the keyboard
    const keyboard = await this.keyboardRepository.findById(input.keyboardId);

    if (!keyboard) {
      throw new Error(`Keyboard with ID ${input.keyboardId} not found`);
    }

    // Validate button index
    if (input.buttonIndex < 0 || input.buttonIndex >= keyboard.Buttons.length) {
      throw new Error(
        `Button index ${input.buttonIndex} is out of bounds. Keyboard has ${keyboard.Buttons.length} buttons.`
      );
    }

    // Validate that keyboard will have at least one button after deletion
    if (keyboard.Buttons.length <= 1) {
      throw new Error(
        "Cannot delete button. Keyboard must have at least one button."
      );
    }

    // Create new keyboard with button removed
    const updatedButtons = keyboard.Buttons.filter(
      (_, index) => index !== input.buttonIndex
    );

    const updatedKeyboard = new Keyboard({
      id: keyboard.id,
      type: keyboard.type,
      Buttons: updatedButtons,
      DefaultHeight: keyboard.DefaultHeight,
      InputFieldState: keyboard.InputFieldState,
      BgColor: keyboard.BgColor,
      hidden: keyboard.hidden,
      humanReadableName: keyboard.humanReadableName,
      title: keyboard.title,
      isBroadcast: keyboard.isBroadcast,
      createdAt: keyboard.createdAt,
      updatedAt: new Date().toISOString(),
    });

    // Save updated keyboard
    await this.keyboardRepository.update(input.keyboardId, updatedKeyboard);
  }
}
