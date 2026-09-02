/**
 * KeyboardTransformer Domain Service
 *
 * Transforms Keyboard and Button entities to Viber API format for storage compatibility.
 * This service provides transformation logic to convert domain entities to the exact
 * format required by the Viber API. The Viber Service reads this data and sends it to the Viber API.
 */

import { Keyboard } from "../Keyboard";
import { Button } from "../Button";

/**
 * KeyboardTransformer domain service
 *
 * Transforms keyboards and buttons to Viber API format for storage compatibility.
 * The Viber Service reads this data and sends it to the Viber API.
 */
export class KeyboardTransformer {
  /**
   * Transforms a keyboard entity to Viber API format
   *
   * @param keyboard - Keyboard entity to transform
   * @returns Keyboard object in Viber API format
   */
  public toViberApiFormat(keyboard: Keyboard): object;
  /**
   * Transforms a button entity to Viber API format
   *
   * @param button - Button entity to transform
   * @returns Button object in Viber API format
   */
  public toViberApiFormat(button: Button): object;
  /**
   * Implementation of toViberApiFormat method overloads
   */
  public toViberApiFormat(keyboardOrButton: Keyboard | Button): object {
    // Check if it's a Keyboard (has 'type' property)
    if ("type" in keyboardOrButton && keyboardOrButton.type === "keyboard") {
      const keyboard = keyboardOrButton as Keyboard;
      const viberKeyboard: any = {
        Type: keyboard.type,
        Buttons: keyboard.Buttons.map((button) =>
          this.toViberApiFormat(button)
        ),
        DefaultHeight: keyboard.DefaultHeight,
        InputFieldState: keyboard.InputFieldState,
      };

      // Add optional fields
      if (keyboard.BgColor !== null) {
        viberKeyboard.BgColor = keyboard.BgColor;
      }

      return viberKeyboard;
    }

    // Otherwise it's a Button
    const button = keyboardOrButton as Button;
    const viberButton: any = {
      Columns: button.Columns,
      Rows: button.Rows,
      Text: this.normalizeButtonText(button.Text, button.TextColor),
      TextColor: button.TextColor,
      ActionType: button.ActionType,
      ActionBody: button.ActionBody,
      TextVAlign: button.TextVAlign,
      TextHAlign: button.TextHAlign,
      TextSize: button.TextSize,
      Silent: button.Silent,
    };

    // Add optional background color (only if BgMediaType is not 'picture')
    // Viber API requirement: BgColor should be removed if BgMediaType is 'picture'
    if (button.BgColor !== null && button.BgMediaType !== "picture") {
      viberButton.BgColor = button.BgColor;
    }

    // Add optional background media fields
    if (button.BgMedia !== null) {
      viberButton.BgMedia = button.BgMedia;
      viberButton.BgMediaType = button.BgMediaType;
      viberButton.BgMediaScaleType = button.BgMediaScaleType;
      viberButton.BgLoop = button.BgLoop;
    }

    // Add open-url specific fields
    if (button.ActionType === "open-url") {
      viberButton.OpenURLType = button.OpenURLType;
      viberButton.InternalBrowser = button.InternalBrowser;
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
  public normalizeButtonText(text: string, textColor: string): string {
    // If text already contains font tag, return as is
    if (text.includes("<font")) {
      return text;
    }

    // Wrap text in font tag with TextColor
    return `<font color="${textColor}">${text}</font>`;
  }
}
