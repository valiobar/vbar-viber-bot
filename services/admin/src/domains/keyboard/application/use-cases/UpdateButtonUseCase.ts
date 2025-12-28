/**
 * Update Button Use Case Implementation
 *
 * Implements the UpdateButtonUseCase interface.
 * This use case updates an existing Button entity within a Keyboard, validates it, and saves the keyboard.
 *
 * Buttons are always embedded within Keyboards, so this use case
 * updates a button at a specific index in a keyboard's buttons array.
 */

import {
  UpdateButtonInput,
  UpdateButtonUseCase,
} from "../../ports/in/UpdateButtonUseCase";
import { ButtonDTO } from "../dto/ButtonDTO";
import { Button } from "../../entities/Button";
import { Keyboard } from "../../entities/Keyboard";
import { KeyboardRepository } from "../../ports/out/KeyboardRepository";
import { ViberApiValidator } from "../../services/ViberApiValidator";

/**
 * Update Button Use Case Implementation
 *
 * Handles the update of existing Button entities within a Keyboard with validation.
 */
export class UpdateButtonUseCaseImpl implements UpdateButtonUseCase {
  constructor(
    private readonly keyboardRepository: KeyboardRepository,
    private readonly viberApiValidator: ViberApiValidator
  ) {}

  /**
   * Execute the update button use case
   *
   * @param input - Input data for updating the button (includes keyboardId and buttonIndex)
   * @returns Promise resolving to the updated ButtonDTO
   * @throws Error if keyboard not found, button index out of bounds, update fails, or validation fails
   */
  async execute(input: UpdateButtonInput): Promise<ButtonDTO> {
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

    // Get existing button
    const existingButton = keyboard.Buttons[input.buttonIndex];

    // Update button properties from input
    // Create updated Button entity with merged properties
    const updatedButton = new Button({
      id: existingButton.id,
      Columns:
        input.Columns !== undefined ? input.Columns : existingButton.Columns,
      Rows: input.Rows !== undefined ? input.Rows : existingButton.Rows,
      Text: input.Text !== undefined ? input.Text : existingButton.Text,
      TextColor:
        input.TextColor !== undefined
          ? input.TextColor
          : existingButton.TextColor,
      BgColor:
        input.BgColor !== undefined ? input.BgColor : existingButton.BgColor,
      BgMedia:
        input.BgMedia !== undefined ? input.BgMedia : existingButton.BgMedia,
      BgMediaType:
        input.BgMediaType !== undefined
          ? input.BgMediaType
          : existingButton.BgMediaType,
      BgMediaScaleType:
        input.BgMediaScaleType !== undefined
          ? input.BgMediaScaleType
          : existingButton.BgMediaScaleType,
      BgLoop: input.BgLoop !== undefined ? input.BgLoop : existingButton.BgLoop,
      ActionType:
        input.ActionType !== undefined
          ? input.ActionType
          : existingButton.ActionType,
      ActionBody:
        input.ActionBody !== undefined
          ? input.ActionBody
          : existingButton.ActionBody,
      OpenURLType:
        input.OpenURLType !== undefined
          ? input.OpenURLType
          : existingButton.OpenURLType,
      InternalBrowser:
        input.InternalBrowser !== undefined
          ? input.InternalBrowser
          : existingButton.InternalBrowser,
      TextVAlign:
        input.TextVAlign !== undefined
          ? input.TextVAlign
          : existingButton.TextVAlign,
      TextHAlign:
        input.TextHAlign !== undefined
          ? input.TextHAlign
          : existingButton.TextHAlign,
      TextSize:
        input.TextSize !== undefined ? input.TextSize : existingButton.TextSize,
      Silent: input.Silent !== undefined ? input.Silent : existingButton.Silent,
      isJson: input.isJson !== undefined ? input.isJson : existingButton.isJson,
      createdAt: existingButton.createdAt,
      updatedAt: new Date().toISOString(),
    });

    // Validate updated button using ViberApiValidator
    this.viberApiValidator.validateButton(updatedButton);

    // Create new keyboard with updated button at the specified index
    const updatedButtons = [...keyboard.Buttons];
    updatedButtons[input.buttonIndex] = updatedButton;

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

    // Get the updated button
    const savedButton = savedKeyboard.Buttons[input.buttonIndex];

    // Return ButtonDTO
    return ButtonDTO.fromEntity(savedButton);
  }
}
