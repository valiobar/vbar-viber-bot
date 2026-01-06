/**
 * Update Keyboard Use Case Implementation
 *
 * Implements the UpdateKeyboardUseCase interface.
 * This use case updates an existing Keyboard entity, validates it, and saves it to the repository.
 */

import {
  UpdateKeyboardInput,
  UpdateKeyboardUseCase,
} from "../../ports/in/UpdateKeyboardUseCase";
import { KeyboardDTO } from "../dto/KeyboardDTO";
import { Keyboard } from "../../entities/Keyboard";
import { Button } from "../../entities/Button";
import { KeyboardRepository } from "../../ports/out/KeyboardRepository";
import { ViberApiValidator } from "../../services/ViberApiValidator";

/**
 * Update Keyboard Use Case Implementation
 *
 * Handles the update of existing Keyboard entities with validation.
 */
export class UpdateKeyboardUseCaseImpl implements UpdateKeyboardUseCase {
  constructor(
    private readonly keyboardRepository: KeyboardRepository,
    private readonly viberApiValidator: ViberApiValidator
  ) {}

  /**
   * Execute the update keyboard use case
   *
   * @param id - Keyboard ID to update
   * @param input - Input data for updating the keyboard
   * @returns Promise resolving to the updated KeyboardDTO
   * @throws Error if keyboard not found, update fails, or validation fails
   */
  async execute(id: string, input: UpdateKeyboardInput): Promise<KeyboardDTO> {
    // Get existing keyboard from repository
    const existingKeyboard = await this.keyboardRepository.findById(id);

    if (!existingKeyboard) {
      throw new Error(`Keyboard with ID ${id} not found`);
    }

    // Update keyboard properties from input
    // Convert ButtonDTOs to Button entities if buttons are provided
    let buttons = existingKeyboard.Buttons;
    if (input.Buttons !== undefined) {
      buttons = input.Buttons.map((buttonDto) => {
        // Use Button.create() which generates temporary IDs
        return Button.create({
          Columns: buttonDto.Columns,
          Rows: buttonDto.Rows,
          Text: buttonDto.Text,
          TextColor: buttonDto.TextColor,
          BgColor: buttonDto.BgColor,
          BgMedia: buttonDto.BgMedia,
          BgMediaType: buttonDto.BgMediaType,
          BgMediaScaleType: buttonDto.BgMediaScaleType,
          BgLoop: buttonDto.BgLoop,
          ActionType: buttonDto.ActionType,
          ActionBody: buttonDto.ActionBody,
          OpenURLType: buttonDto.OpenURLType,
          InternalBrowser: buttonDto.InternalBrowser,
          TextVAlign: buttonDto.TextVAlign,
          TextHAlign: buttonDto.TextHAlign,
          TextSize: buttonDto.TextSize,
          Silent: buttonDto.Silent,
          isJson: buttonDto.isJson,
        });
      });
    }

    // Create updated Keyboard entity with merged properties
    const updatedKeyboard = new Keyboard({
      id: existingKeyboard.id,
      type: existingKeyboard.type,
      Buttons: buttons,
      DefaultHeight:
        input.DefaultHeight !== undefined
          ? input.DefaultHeight
          : existingKeyboard.DefaultHeight,
      InputFieldState:
        input.InputFieldState !== undefined
          ? input.InputFieldState
          : existingKeyboard.InputFieldState,
      BgColor:
        input.BgColor !== undefined ? input.BgColor : existingKeyboard.BgColor,
      hidden:
        input.hidden !== undefined ? input.hidden : existingKeyboard.hidden,
      humanReadableName:
        input.humanReadableName !== undefined
          ? input.humanReadableName
          : existingKeyboard.humanReadableName,
      title: input.title !== undefined ? input.title : existingKeyboard.title,
      isBroadcast:
        input.isBroadcast !== undefined
          ? input.isBroadcast
          : existingKeyboard.isBroadcast,
      createdAt: existingKeyboard.createdAt,
      updatedAt: new Date().toISOString(),
    });

    // Validate updated keyboard using ViberApiValidator
    this.viberApiValidator.validateKeyboard(updatedKeyboard);

    // Save updated keyboard via KeyboardRepository
    const savedKeyboard = await this.keyboardRepository.update(
      id,
      updatedKeyboard
    );

    // Return KeyboardDTO
    return KeyboardDTO.fromEntity(savedKeyboard);
  }
}



