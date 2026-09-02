/**
 * ViberApiValidator Domain Service
 *
 * Validates Keyboard and Button entities against Viber API specifications.
 * This service ensures data integrity and compliance with Viber API format requirements.
 */

import { Keyboard } from "../Keyboard";
import { Button } from "../Button";
import { ActionType } from "../types";
import { Validators } from "./Validators";

/**
 * ViberApiValidator domain service
 *
 * Validates keyboards and buttons against Viber API specifications.
 * This service validates data format for storage compatibility, not for making API calls.
 */
export class ViberApiValidator {
  /**
   * Validates a keyboard against Viber API specifications
   *
   * @param keyboard - Keyboard entity to validate
   * @throws Error if keyboard is invalid
   */
  public validateKeyboard(keyboard: Keyboard): void {
    if (!keyboard) {
      throw new Error("Keyboard is required");
    }

    // Validate keyboard type
    if (keyboard.type !== "keyboard") {
      throw new Error("Keyboard type must be 'keyboard'");
    }

    // Validate buttons array
    if (!keyboard.Buttons || keyboard.Buttons.length === 0) {
      throw new Error("Keyboard must have at least one button");
    }

    // Validate each button
    for (let i = 0; i < keyboard.Buttons.length; i++) {
      this.validateButton(keyboard.Buttons[i]);
    }

    // Validate button layout
    this.validateButtonLayout(keyboard.Buttons);

    // Validate background color if provided
    if (keyboard.BgColor !== null) {
      Validators.validateBgColor(keyboard.BgColor);
    }
  }

  /**
   * Validates a button against Viber API specifications
   *
   * @param button - Button entity to validate
   * @throws Error if button is invalid
   */
  public validateButton(button: Button): void {
    if (!button) {
      throw new Error("Button is required");
    }

    // Validate button dimensions
    this.validateButtonDimensions(button.Columns, button.Rows);

    // Validate text
    if (typeof button.Text !== "string") {
      throw new Error("Button Text must be a string");
    }

    // Validate text color
    Validators.validateTextColor(button.TextColor);

    // Validate background color if provided
    if (button.BgColor !== null) {
      Validators.validateBgColor(button.BgColor);
    }

    // Validate background media if provided
    if (button.BgMedia !== null) {
      this.validateMediaUrl(button.BgMedia);
    }

    // Validate action type
    Validators.validateActionType(button.ActionType);

    // Validate action body
    Validators.validateActionBody(
      button.ActionBody,
      button.ActionType,
      button.isJson
    );

    // Validate open-url specific fields
    if (button.ActionType === "open-url") {
      if (!button.OpenURLType) {
        throw new Error("OpenURLType is required for open-url action");
      }
      if (!button.InternalBrowser) {
        throw new Error("InternalBrowser is required for open-url action");
      }
    }

    // Viber API requirement: If BgMediaType is 'picture', BgColor should not be set
    if (button.BgMediaType === "picture" && button.BgColor !== null) {
      // Note: This is a warning-level validation. We keep BgColor in the entity
      // but it should be removed during transformation to Viber API format
    }
  }

  /**
   * Validates button layout constraints
   *
   * @param buttons - Array of buttons to validate layout for
   * @throws Error if layout is invalid
   */
  public validateButtonLayout(buttons: Button[]): void {
    Validators.validateButtonLayout(buttons);
  }

  /**
   * Validates action type for specific context
   *
   * @param actionType - Action type to validate
   * @param context - Context where action is used ('keyboard' or 'carousel')
   * @throws Error if action type is invalid for context
   */
  public validateActionTypeForContext(
    actionType: ActionType,
    context: "keyboard" | "carousel"
  ): void {
    // Location picker and share phone actions are not allowed in carousels
    if (context === "carousel") {
      if (actionType === "location-picker" || actionType === "share-phone") {
        throw new Error(
          `Action type '${actionType}' is not allowed in carousel context`
        );
      }
    }

    // All action types are valid for keyboard context
    // No additional validation needed for keyboard context
  }

  /**
   * Validates button dimensions
   *
   * @param columns - Number of columns (1-6)
   * @param rows - Number of rows (1-2)
   * @throws Error if dimensions are invalid
   */
  public validateButtonDimensions(columns: number, rows: number): void {
    // Validate columns
    if (columns < 1 || columns > 6) {
      throw new Error("Button columns must be between 1 and 6 (inclusive)");
    }

    // Validate rows
    if (rows < 1 || rows > 2) {
      throw new Error("Button rows must be between 1 and 2 (inclusive)");
    }
  }

  /**
   * Validates media URL format
   *
   * @param url - Media URL to validate
   * @throws Error if URL is invalid
   */
  public validateMediaUrl(url: string): void {
    if (!url || typeof url !== "string") {
      throw new Error("Media URL must be a non-empty string");
    }

    const trimmedUrl = url.trim();
    if (trimmedUrl.length === 0) {
      throw new Error("Media URL cannot be empty");
    }

    // Validate URL format
    try {
      const urlObj = new URL(trimmedUrl);
      // Check if URL has a valid protocol (http, https)
      if (!["http:", "https:"].includes(urlObj.protocol)) {
        throw new Error("Media URL must use http or https protocol");
      }
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error("Media URL must be a valid URL");
      }
      throw error;
    }
  }

  /**
   * Validates hex color code format
   *
   * @param color - Color code to validate
   * @throws Error if color is invalid
   */
  public validateColorCode(color: string): void {
    Validators.validateHexColor(color, "Color");
  }
}
