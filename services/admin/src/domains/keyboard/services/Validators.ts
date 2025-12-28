/**
 * Keyboard Domain Validators
 *
 * Centralized validation functions for Keyboard and Button entities.
 * All validation logic is extracted here for better code organization and reusability.
 */

import {
  ActionType,
  TextSize,
  TextVAlign,
  TextHAlign,
  BgMediaType,
  OpenURLType,
  InternalBrowserMode,
  InternalBrowserConfig,
  InputFieldState,
} from "../types";
import { Button } from "../entities/Button";

/**
 * Validator utility class with static methods for validating Keyboard and Button properties
 */
export class Validators {
  /**
   * Validates columns (1-6)
   *
   * @param columns - Columns to validate
   * @returns Validated columns
   * @throws Error if columns is invalid
   */
  static validateColumns(columns: number): number {
    if (typeof columns !== "number" || isNaN(columns)) {
      throw new Error("Columns must be a number");
    }

    if (columns < 1 || columns > 6) {
      throw new Error("Columns must be between 1 and 6 (inclusive)");
    }

    return Math.floor(columns);
  }

  /**
   * Validates rows (1-2)
   *
   * @param rows - Rows to validate
   * @returns Validated rows
   * @throws Error if rows is invalid
   */
  static validateRows(rows: number): number {
    if (typeof rows !== "number" || isNaN(rows)) {
      throw new Error("Rows must be a number");
    }

    if (rows < 1 || rows > 2) {
      throw new Error("Rows must be between 1 and 2 (inclusive)");
    }

    return Math.floor(rows);
  }

  /**
   * Validates text
   *
   * @param text - Text to validate
   * @returns Validated text
   * @throws Error if text is invalid
   */
  static validateText(text: string): string {
    if (typeof text !== "string") {
      throw new Error("Text must be a string");
    }

    // Text can be empty string
    return text;
  }

  /**
   * Validates hex color code
   *
   * @param color - Color to validate
   * @param fieldName - Name of the field for error messages
   * @returns Validated color
   * @throws Error if color is invalid
   */
  static validateHexColor(color: string, fieldName: string = "Color"): string {
    if (typeof color !== "string") {
      throw new Error(`${fieldName} must be a string`);
    }

    const trimmedColor = color.trim();
    if (trimmedColor.length === 0) {
      throw new Error(`${fieldName} cannot be empty`);
    }

    // Validate hex color format (#RRGGBB or #RRGGBBAA)
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;
    if (!hexColorRegex.test(trimmedColor)) {
      throw new Error(
        `${fieldName} must be a valid hex color code (e.g., #FF0000 or #FF0000FF)`
      );
    }

    return trimmedColor;
  }

  /**
   * Validates text color (hex color code)
   *
   * @param color - Color to validate
   * @returns Validated color
   * @throws Error if color is invalid
   */
  static validateTextColor(color: string): string {
    return this.validateHexColor(color, "TextColor");
  }

  /**
   * Validates background color (hex color code or null)
   *
   * @param color - Color to validate
   * @returns Validated color or null
   * @throws Error if color is invalid
   */
  static validateBgColor(color: string | null | undefined): string | null {
    if (color === null || color === undefined) {
      return null;
    }

    if (typeof color !== "string") {
      throw new Error("BgColor must be a string or null");
    }

    const trimmedColor = color.trim();
    if (trimmedColor.length === 0) {
      return null;
    }

    // Validate hex color format
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;
    if (!hexColorRegex.test(trimmedColor)) {
      throw new Error(
        "BgColor must be a valid hex color code (e.g., #FF0000) or null"
      );
    }

    return trimmedColor;
  }

  /**
   * Validates background media URL
   *
   * @param url - URL to validate
   * @returns Validated URL or null
   * @throws Error if URL is invalid
   */
  static validateBgMedia(url: string | null | undefined): string | null {
    if (url === null || url === undefined) {
      return null;
    }

    if (typeof url !== "string") {
      throw new Error("BgMedia must be a string or null");
    }

    const trimmedUrl = url.trim();
    if (trimmedUrl.length === 0) {
      return null;
    }

    // Basic URL validation
    try {
      new URL(trimmedUrl);
    } catch {
      throw new Error("BgMedia must be a valid URL");
    }

    return trimmedUrl;
  }

  /**
   * Validates background media type
   *
   * @param type - Type to validate
   * @returns Validated type
   * @throws Error if type is invalid
   */
  static validateBgMediaType(type: BgMediaType | undefined): BgMediaType {
    if (type === undefined) {
      return "picture";
    }

    const validTypes: BgMediaType[] = ["picture", "gif"];
    if (!validTypes.includes(type)) {
      throw new Error(
        `Invalid BgMediaType. Must be one of: ${validTypes.join(", ")}`
      );
    }

    return type;
  }

  /**
   * Validates action type
   *
   * @param type - Type to validate
   * @returns Validated type
   * @throws Error if type is invalid
   */
  static validateActionType(type: string): ActionType {
    const validTypes: ActionType[] = [
      "reply",
      "open-url",
      "location-picker",
      "share-phone",
      "none",
    ];

    if (!validTypes.includes(type as ActionType)) {
      throw new Error(
        `Invalid ActionType. Must be one of: ${validTypes.join(", ")}`
      );
    }

    return type as ActionType;
  }

  /**
   * Validates action body based on action type
   *
   * @param body - Action body to validate
   * @param actionType - Action type
   * @param isJson - Whether action body is JSON
   * @returns Validated action body
   * @throws Error if action body is invalid
   */
  static validateActionBody(
    body: string,
    actionType: ActionType,
    isJson: boolean
  ): string {
    if (typeof body !== "string") {
      throw new Error("ActionBody must be a string");
    }

    // Validate based on action type
    switch (actionType) {
      case "reply":
        // ActionBody is required for reply, should be text to send
        if (body.trim().length === 0) {
          throw new Error("ActionBody is required for reply action type");
        }
        break;

      case "open-url":
        // ActionBody is required for open-url, should be URL
        if (body.trim().length === 0) {
          throw new Error("ActionBody is required for open-url action type");
        }
        // Validate URL format
        try {
          new URL(body.trim());
        } catch {
          throw new Error("ActionBody must be a valid URL for open-url action");
        }
        break;

      case "location-picker":
      case "share-phone":
      case "none":
        // ActionBody may be empty or specific value
        break;
    }

    // If isJson is true, validate JSON format
    if (isJson) {
      try {
        JSON.parse(body);
      } catch {
        throw new Error("ActionBody must be valid JSON when isJson is true");
      }
    }

    return body;
  }

  /**
   * Validates URL open type
   *
   * @param type - Type to validate
   * @returns Validated type
   * @throws Error if type is invalid
   */
  static validateOpenURLType(type: OpenURLType | undefined): OpenURLType {
    if (type === undefined) {
      return "internal";
    }

    const validTypes: OpenURLType[] = ["internal", "external"];
    if (!validTypes.includes(type)) {
      throw new Error(
        `Invalid OpenURLType. Must be one of: ${validTypes.join(", ")}`
      );
    }

    return type;
  }

  /**
   * Validates internal browser configuration
   *
   * @param browser - Browser config to validate
   * @returns Validated browser config
   * @throws Error if config is invalid
   */
  static validateInternalBrowser(
    browser: InternalBrowserConfig | undefined
  ): InternalBrowserConfig {
    if (browser === undefined) {
      return { Mode: "fullscreen-portrait" };
    }

    if (!browser || typeof browser !== "object") {
      throw new Error("InternalBrowser must be an object");
    }

    const validModes: InternalBrowserMode[] = [
      "fullscreen-portrait",
      "fullscreen-landscape",
      "partial-size",
    ];

    if (!("Mode" in browser) || !validModes.includes(browser.Mode)) {
      throw new Error(
        `InternalBrowser.Mode must be one of: ${validModes.join(", ")}`
      );
    }

    return { Mode: browser.Mode };
  }

  /**
   * Validates text alignment
   *
   * @param align - Alignment to validate
   * @param type - 'vertical' or 'horizontal'
   * @returns Validated alignment
   * @throws Error if alignment is invalid
   */
  static validateTextAlignment(
    align: string | undefined,
    type: "vertical" | "horizontal"
  ): string {
    if (align === undefined) {
      return type === "vertical" ? "middle" : "center";
    }

    if (type === "vertical") {
      const validAligns: TextVAlign[] = ["top", "bottom", "middle"];
      if (!validAligns.includes(align as TextVAlign)) {
        throw new Error(
          `Invalid TextVAlign. Must be one of: ${validAligns.join(", ")}`
        );
      }
    } else {
      const validAligns: TextHAlign[] = ["left", "center", "right"];
      if (!validAligns.includes(align as TextHAlign)) {
        throw new Error(
          `Invalid TextHAlign. Must be one of: ${validAligns.join(", ")}`
        );
      }
    }

    return align;
  }

  /**
   * Validates text size
   *
   * @param size - Size to validate
   * @returns Validated size
   * @throws Error if size is invalid
   */
  static validateTextSize(size: TextSize | undefined): TextSize {
    if (size === undefined) {
      return "regular";
    }

    const validSizes: TextSize[] = ["small", "regular", "large"];
    if (!validSizes.includes(size)) {
      throw new Error(
        `Invalid TextSize. Must be one of: ${validSizes.join(", ")}`
      );
    }

    return size;
  }

  /**
   * Validates keyboard type (must always be 'keyboard')
   *
   * @param type - Type to validate
   * @returns Validated type
   * @throws Error if type is invalid
   */
  static validateKeyboardType(type: string): "keyboard" {
    if (type !== "keyboard") {
      throw new Error("Keyboard type must always be 'keyboard'");
    }

    return "keyboard";
  }

  /**
   * Validates buttons array
   *
   * @param buttons - Buttons array to validate
   * @returns Validated buttons array
   * @throws Error if buttons are invalid
   */
  static validateButtons(buttons: Button[]): Button[] {
    if (!Array.isArray(buttons)) {
      throw new Error("Buttons must be an array");
    }

    if (buttons.length === 0) {
      throw new Error("Buttons array cannot be empty");
    }

    // All buttons must be Button entities
    for (const button of buttons) {
      if (!(button instanceof Button)) {
        throw new Error("All buttons must be Button entities");
      }
    }

    return buttons;
  }

  /**
   * Validates input field state
   *
   * @param state - State to validate
   * @returns Validated state
   * @throws Error if state is invalid
   */
  static validateInputFieldState(
    state: InputFieldState | undefined
  ): InputFieldState {
    if (state === undefined) {
      return "hidden";
    }

    const validStates: InputFieldState[] = ["regular", "minimized", "hidden"];
    if (!validStates.includes(state)) {
      throw new Error(
        `Invalid InputFieldState. Must be one of: ${validStates.join(", ")}`
      );
    }

    return state;
  }

  /**
   * Validates human-readable name
   *
   * @param name - Name to validate
   * @returns Validated name
   * @throws Error if name is invalid
   */
  static validateHumanReadableName(name: string): string {
    if (!name || typeof name !== "string") {
      throw new Error("Human-readable name is required and must be a string");
    }

    const trimmedName = name.trim();

    if (trimmedName.length === 0) {
      throw new Error("Human-readable name cannot be empty");
    }

    if (trimmedName.length > 100) {
      throw new Error("Human-readable name must be 100 characters or less");
    }

    return trimmedName;
  }

  /**
   * Validates title
   *
   * @param title - Title to validate
   * @returns Validated title or null
   * @throws Error if title is invalid
   */
  static validateTitle(title: string | null | undefined): string | null {
    if (title === null || title === undefined) {
      return null;
    }

    if (typeof title !== "string") {
      throw new Error("Title must be a string or null");
    }

    const trimmedTitle = title.trim();
    if (trimmedTitle.length === 0) {
      return null;
    }

    return trimmedTitle;
  }

  /**
   * Validates button layout (no overlaps, fits constraints)
   *
   * @param buttons - Array of buttons to validate layout for
   * @throws Error if layout is invalid
   */
  static validateButtonLayout(buttons: Button[]): void {
    // Viber API constraints:
    // - Total columns per row should not exceed 6
    // - Buttons can span multiple rows (up to 2 rows per button)
    // - Buttons should not overlap

    // Track occupied positions in a grid
    const maxColumns = 6;
    const grid: boolean[][] = [];

    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i];
      const columns = button.Columns;
      const rows = button.Rows;

      // Validate button dimensions
      if (columns < 1 || columns > maxColumns) {
        throw new Error(
          `Button at index ${i}: Columns must be between 1 and ${maxColumns}`
        );
      }

      if (rows < 1 || rows > 2) {
        throw new Error(`Button at index ${i}: Rows must be between 1 and 2`);
      }

      // Find position for this button (simple left-to-right, top-to-bottom layout)
      let placed = false;
      let startRow = 0;
      let startCol = 0;

      // Try to find a position where the button fits
      while (!placed && startRow < 10) {
        // Limit to 10 rows to prevent infinite loop
        let canPlace = true;

        // Check if button fits at this position
        for (let r = 0; r < rows; r++) {
          const currentRow = startRow + r;
          if (!grid[currentRow]) {
            grid[currentRow] = new Array(maxColumns).fill(false);
          }

          for (let c = 0; c < columns; c++) {
            const currentCol = startCol + c;
            if (currentCol >= maxColumns) {
              canPlace = false;
              break;
            }
            if (grid[currentRow][currentCol]) {
              canPlace = false;
              break;
            }
          }
          if (!canPlace) break;
        }

        if (canPlace) {
          // Place button
          for (let r = 0; r < rows; r++) {
            const currentRow = startRow + r;
            for (let c = 0; c < columns; c++) {
              const currentCol = startCol + c;
              grid[currentRow][currentCol] = true;
            }
          }
          placed = true;
        } else {
          // Try next position
          startCol++;
          if (startCol + columns > maxColumns) {
            startCol = 0;
            startRow++;
          }
        }
      }

      if (!placed) {
        throw new Error(
          `Button at index ${i}: Cannot place button - layout constraints exceeded`
        );
      }
    }

    // Validate total columns used
    const totalColumns = buttons.reduce(
      (sum, button) => sum + button.Columns,
      0
    );
    if (totalColumns > maxColumns) {
      throw new Error(
        `Total columns used (${totalColumns}) exceeds maximum (${maxColumns})`
      );
    }
  }
}
