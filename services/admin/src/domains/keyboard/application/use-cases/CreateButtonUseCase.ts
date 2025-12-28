/**
 * Create Button Use Case Implementation
 *
 * Implements the CreateButtonUseCase interface.
 * This use case creates a new Button entity, adds it to a Keyboard, validates it, and saves the keyboard.
 *
 * Buttons are always embedded within Keyboards, so this use case
 * adds a button to an existing keyboard's buttons array.
 */

import {
  CreateButtonInput,
  CreateButtonUseCase,
} from "../../ports/in/CreateButtonUseCase";
import { ButtonDTO } from "../dto/ButtonDTO";
import { Button } from "../../entities/Button";
import { Keyboard } from "../../entities/Keyboard";
import { KeyboardRepository } from "../../ports/out/KeyboardRepository";
import { ViberApiValidator } from "../../services/ViberApiValidator";

/**
 * Create Button Use Case Implementation
 *
 * Handles the creation of new Button entities within a Keyboard with validation.
 */
export class CreateButtonUseCaseImpl implements CreateButtonUseCase {
  constructor(
    private readonly keyboardRepository: KeyboardRepository,
    private readonly viberApiValidator: ViberApiValidator
  ) {}

  /**
   * Execute the create button use case
   *
   * @param input - Input data for creating the button
   * @returns Promise resolving to the created ButtonDTO
   * @throws Error if keyboard not found, button creation fails, or validation fails
   */
  async execute(input: CreateButtonInput): Promise<ButtonDTO> {
    // Get the keyboard
    const keyboard = await this.keyboardRepository.findById(input.keyboardId);

    if (!keyboard) {
      throw new Error(`Keyboard with ID ${input.keyboardId} not found`);
    }

    // Create Button entity from input
    const button = Button.create({
      Columns: input.Columns ?? 1,
      Rows: input.Rows ?? 1,
      Text: input.Text,
      TextColor: input.TextColor,
      BgColor: input.BgColor,
      BgMedia: input.BgMedia,
      BgMediaType: input.BgMediaType,
      BgMediaScaleType: input.BgMediaScaleType,
      BgLoop: input.BgLoop,
      ActionType: input.ActionType,
      ActionBody: input.ActionBody,
      OpenURLType: input.OpenURLType,
      InternalBrowser: input.InternalBrowser,
      TextVAlign: input.TextVAlign,
      TextHAlign: input.TextHAlign,
      TextSize: input.TextSize,
      Silent: input.Silent,
      isJson: input.isJson,
    });

    // Validate button using ViberApiValidator
    this.viberApiValidator.validateButton(button);

    // Create new keyboard with the new button added
    const updatedButtons = [...keyboard.Buttons, button];
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
    const savedKeyboard = await this.keyboardRepository.update(
      keyboard.id,
      updatedKeyboard
    );

    // Get the newly added button (last in array)
    const savedButton = savedKeyboard.Buttons[savedKeyboard.Buttons.length - 1];

    // Return ButtonDTO
    return ButtonDTO.fromEntity(savedButton);
  }
}
