/**
 * Keyboard Converter Service
 *
 * Converts KeyboardDTO to Viber keyboard format for attaching to Viber messages.
 * Transforms button structure to match Viber API requirements.
 *
 * Location: Application layer (Hexagonal Architecture)
 */

import { KeyboardDTO, ButtonDTO } from "../types/DTOs";
import { Logger, ConsoleLogger } from "@vbar/shared";

/**
 * Keyboard Converter Service
 *
 * Converts KeyboardDTO objects to Viber API keyboard format that can be attached to messages.
 * Handles button transformation and optional keyboard fields.
 */
export class KeyboardConverter {
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || new ConsoleLogger("KeyboardConverter");
  }

  /**
   * Convert a KeyboardDTO to Viber API keyboard format
   *
   * @param keyboardDTO - KeyboardDTO to convert
   * @param buttonPrefix - Optional button prefix from bot settings
   * @returns Keyboard object in Viber API format
   */
  convertToViberKeyboard(
    keyboardDTO: KeyboardDTO,
    buttonPrefix?: string | null
  ): any {
    try {
      // Ensure InputFieldState is always set to a valid value
      // Default to "hidden" if undefined, null, or empty string
      // Valid values: "regular", "minimized", "hidden"
      const validStates = ["regular", "minimized", "hidden"] as const;
      const inputFieldState =
        keyboardDTO.InputFieldState &&
        validStates.includes(keyboardDTO.InputFieldState as any)
          ? keyboardDTO.InputFieldState
          : "hidden";

      console.log("inputFieldState", inputFieldState);
      const viberKeyboard: any = {
        Type: keyboardDTO.type,
        Buttons: keyboardDTO.Buttons.map((button) =>
          this.convertButtonToViberFormat(button, buttonPrefix)
        ),

        DefaultHeight: keyboardDTO.DefaultHeight,
        InputFieldState: inputFieldState,
      };

      // Add optional BgColor field (only if not null)
      if (keyboardDTO.BgColor !== null) {
        viberKeyboard.BgColor = keyboardDTO.BgColor;
      }
      console.log("viberKeyboard", viberKeyboard);
      return viberKeyboard;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error("Failed to convert keyboard", {
        keyboardId: keyboardDTO.id,
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Convert a ButtonDTO to Viber API button format
   *
   * @param buttonDTO - ButtonDTO to convert
   * @param buttonPrefix - Optional button prefix from bot settings
   * @returns Button object in Viber API format
   */
  private convertButtonToViberFormat(
    buttonDTO: ButtonDTO,
    buttonPrefix?: string | null
  ): any {
    const viberButton: any = {
      Columns: buttonDTO.Columns,
      Rows: buttonDTO.Rows,
      Text: this.normalizeButtonText(buttonDTO.Text, buttonDTO.TextColor),
      TextColor: buttonDTO.TextColor,
      ActionType: buttonDTO.ActionType,
      ActionBody: buttonPrefix
        ? `${buttonPrefix}${buttonDTO.ActionBody}`
        : buttonDTO.ActionBody,
      TextVAlign: buttonDTO.TextVAlign,
      TextHAlign: buttonDTO.TextHAlign,
      TextSize: buttonDTO.TextSize,
      Silent: buttonDTO.Silent,
    };

    // Add optional background color (only if BgMediaType is not 'picture')
    // Viber API requirement: BgColor should be removed if BgMediaType is 'picture'
    if (buttonDTO.BgColor !== null && buttonDTO.BgMediaType !== "picture") {
      viberButton.BgColor = buttonDTO.BgColor;
    }

    // Add optional background media fields
    if (buttonDTO.BgMedia !== null) {
      viberButton.BgMedia = buttonDTO.BgMedia;
      viberButton.BgMediaType = buttonDTO.BgMediaType;
      viberButton.BgMediaScaleType = buttonDTO.BgMediaScaleType;
      viberButton.BgLoop = buttonDTO.BgLoop;
    }

    // Add open-url specific fields
    if (buttonDTO.ActionType === "open-url") {
      viberButton.OpenURLType = buttonDTO.OpenURLType;
      viberButton.InternalBrowser = buttonDTO.InternalBrowser;
    }

    return viberButton;
  }

  /**
   * Normalizes button text with font tag if needed
   *
   * @param text - Button text to normalize
   * @param textColor - Text color to use in font tag
   * @returns Normalized text with font tag
   */
  private normalizeButtonText(text: string, textColor: string): string {
    // If text already contains font tag, return as is
    if (text.includes("<font")) {
      return text;
    }

    // Wrap text in font tag with TextColor
    return `<font color="${textColor}">${text}</font>`;
  }
}
