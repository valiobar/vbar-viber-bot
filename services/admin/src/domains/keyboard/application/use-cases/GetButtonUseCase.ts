/**
 * Get Button Use Case Implementation
 *
 * Implements the GetButtonUseCase interface.
 * This use case retrieves a Button entity from a Keyboard by index.
 *
 * Buttons are always embedded within Keyboards, so this use case
 * retrieves a button at a specific index from a keyboard's buttons array.
 */

import {
  GetButtonInput,
  GetButtonUseCase,
} from "../../ports/in/GetButtonUseCase";
import { ButtonDTO } from "../dto/ButtonDTO";
import { KeyboardRepository } from "../../ports/out/KeyboardRepository";

/**
 * Get Button Use Case Implementation
 *
 * Handles the retrieval of Button entities from Keyboards by index.
 */
export class GetButtonUseCaseImpl implements GetButtonUseCase {
  constructor(private readonly keyboardRepository: KeyboardRepository) {}

  /**
   * Execute the get button use case
   *
   * @param input - Input data for getting the button (includes keyboardId and buttonIndex)
   * @returns Promise resolving to the ButtonDTO
   * @throws Error if keyboard not found or button index out of bounds
   */
  async execute(input: GetButtonInput): Promise<ButtonDTO> {
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

    // Get button at the specified index
    const button = keyboard.Buttons[input.buttonIndex];

    // Convert to DTO
    return ButtonDTO.fromEntity(button);
  }
}
