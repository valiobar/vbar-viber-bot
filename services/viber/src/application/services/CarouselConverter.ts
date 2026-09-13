/**
 * Carousel Converter Service
 *
 * Converts CarouselDTO to Viber rich_media format for sending via Message.RichMedia.
 * Transforms button structure to match Viber API requirements.
 *
 * Location: Application layer (Hexagonal Architecture)
 */

import { CarouselDTO, ButtonDTO } from "../types/DTOs";
import { Logger, ConsoleLogger } from "@vbar/shared";

/**
 * Carousel Converter Service
 *
 * Converts CarouselDTO objects to the Viber rich_media payload object.
 * Handles button transformation and optional carousel fields.
 */
export class CarouselConverter {
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || new ConsoleLogger("CarouselConverter");
  }

  /**
   * Convert a CarouselDTO to the Viber rich_media payload object
   *
   * @param carouselDTO - CarouselDTO to convert
   * @param buttonPrefix - Optional button prefix from bot settings
   * @returns rich_media object in Viber API format
   */
  convertToViberRichMedia(
    carouselDTO: CarouselDTO,
    buttonPrefix?: string | null
  ): any {
    try {
      const richMedia: any = {
        Type: "rich_media",
        ButtonsGroupColumns: carouselDTO.ButtonsGroupColumns,
        ButtonsGroupRows: carouselDTO.ButtonsGroupRows,
        Buttons: carouselDTO.Buttons.map((button) =>
          this.convertButtonToViberFormat(button, buttonPrefix)
        ),
      };
      if (carouselDTO.BgColor !== null) {
        richMedia.BgColor = carouselDTO.BgColor;
      }
      return richMedia;
    } catch (error) {
      this.logger.error("Failed to convert carousel", {
        carouselId: carouselDTO.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Convert a ButtonDTO to Viber API button format
   *
   * Prefix is applied only to reply ActionBodys (open-url bodies are URLs).
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
      ActionType: buttonDTO.ActionType,
      ActionBody:
        buttonPrefix && buttonDTO.ActionType === "reply"
          ? `${buttonPrefix}${buttonDTO.ActionBody}`
          : buttonDTO.ActionBody,
      TextVAlign: buttonDTO.TextVAlign,
      TextHAlign: buttonDTO.TextHAlign,
      TextSize: buttonDTO.TextSize,
      Silent: buttonDTO.Silent,
    };
    // Viber: BgColor is an independent HEX field. Do not drop it because
    // BgMediaType defaults to "picture" on stored buttons with no media.
    if (buttonDTO.BgColor !== null) {
      viberButton.BgColor = buttonDTO.BgColor;
    }
    if (buttonDTO.BgMedia !== null) {
      viberButton.BgMedia = buttonDTO.BgMedia;
      viberButton.BgMediaType = buttonDTO.BgMediaType;
      viberButton.BgMediaScaleType = buttonDTO.BgMediaScaleType;
      viberButton.BgLoop = buttonDTO.BgLoop;
    }
    if (buttonDTO.ActionType === "open-url") {
      viberButton.OpenURLType = buttonDTO.OpenURLType;
      viberButton.InternalBrowser = buttonDTO.InternalBrowser;
    }
    if (buttonDTO.Frame != null) {
      viberButton.Frame = {
        BorderWidth: buttonDTO.Frame.BorderWidth,
        BorderColor: buttonDTO.Frame.BorderColor,
        CornerRadius: buttonDTO.Frame.CornerRadius,
      };
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
    if (text.includes("<font")) return text;
    return `<font color="${textColor}">${text}</font>`;
  }
}
