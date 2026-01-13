/**
 * Create Keyboard Use Case Implementation
 *
 * Implements the CreateKeyboardUseCase interface.
 * This use case creates a new Keyboard entity, validates it, and saves it to the repository.
 */

import {
  CreateKeyboardInput,
  CreateKeyboardUseCase,
} from "../../ports/in/CreateKeyboardUseCase";
import { KeyboardDTO } from "../dto/KeyboardDTO";
import { ButtonDTO } from "../dto/ButtonDTO";
import { Keyboard } from "../../entities/Keyboard";
import { Button } from "../../entities/Button";
import { KeyboardRepository } from "../../ports/out/KeyboardRepository";
import { ViberApiValidator } from "../../services/ViberApiValidator";

/**
 * Create Keyboard Use Case Implementation
 *
 * Handles the creation of new Keyboard entities with validation.
 */
export class CreateKeyboardUseCaseImpl implements CreateKeyboardUseCase {
  constructor(
    private readonly keyboardRepository: KeyboardRepository,
    private readonly viberApiValidator: ViberApiValidator
  ) {}

  /**
   * Execute the create keyboard use case
   *
   * @param input - Input data for creating the keyboard
   * @returns Promise resolving to the created KeyboardDTO
   * @throws Error if keyboard creation fails or validation fails
   */
  async execute(input: CreateKeyboardInput): Promise<KeyboardDTO> {
    // Convert ButtonDTOs to Button entities
    const buttons = input.Buttons.map((buttonDto) => {
      // Create Button entity from DTO (without id, createdAt, updatedAt)
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

    // Create Keyboard entity
    const keyboard = Keyboard.create({
      Buttons: buttons,
      DefaultHeight: input.DefaultHeight,
      InputFieldState: input.InputFieldState,
      BgColor: input.BgColor,
      hidden: input.hidden,
      humanReadableName: input.humanReadableName,
      title: input.title,
      isBroadcast: input.isBroadcast,
    });

    // Validate keyboard using ViberApiValidator
    this.viberApiValidator.validateKeyboard(keyboard);

    // Save keyboard via KeyboardRepository
    const savedKeyboard = await this.keyboardRepository.create(keyboard);

    // Return KeyboardDTO
    return KeyboardDTO.fromEntity(savedKeyboard);
  }
}





