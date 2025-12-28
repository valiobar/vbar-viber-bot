/**
 * Update Button Use Case Interface
 *
 * Input port interface for updating an existing Button within a Keyboard.
 * This follows Hexagonal Architecture principles.
 *
 * Buttons are always embedded within Keyboards, so this use case
 * updates a button at a specific index in a keyboard's buttons array.
 */

import { ButtonDTO } from "../../application/dto/ButtonDTO";
import {
  ActionType,
  TextSize,
  TextVAlign,
  TextHAlign,
  BgMediaType,
  OpenURLType,
  InternalBrowserConfig,
} from "../../types";

/**
 * Input data for updating an existing Button
 */
export interface UpdateButtonInput {
  /**
   * ID of the keyboard containing the button
   * Required
   */
  keyboardId: string;

  /**
   * Index of the button in the keyboard's buttons array
   * Required
   */
  buttonIndex: number;

  /**
   * Number of columns the button occupies (1-6)
   */
  Columns?: number;

  /**
   * Number of rows the button occupies (1-3)
   */
  Rows?: number;

  /**
   * Button text (with HTML formatting for color)
   */
  Text?: string;

  /**
   * Text color (hex code)
   */
  TextColor?: string;

  /**
   * Background color (hex code)
   */
  BgColor?: string | null;

  /**
   * Background media URL
   */
  BgMedia?: string | null;

  /**
   * Background media type
   */
  BgMediaType?: BgMediaType;

  /**
   * Background media scale type
   */
  BgMediaScaleType?: string;

  /**
   * Whether background media loops
   */
  BgLoop?: boolean;

  /**
   * Button action type
   */
  ActionType?: ActionType;

  /**
   * Action body (content depends on ActionType)
   */
  ActionBody?: string;

  /**
   * URL open type for open-url action
   */
  OpenURLType?: OpenURLType;

  /**
   * Internal browser configuration for open-url action
   */
  InternalBrowser?: InternalBrowserConfig;

  /**
   * Vertical text alignment
   */
  TextVAlign?: TextVAlign;

  /**
   * Horizontal text alignment
   */
  TextHAlign?: TextHAlign;

  /**
   * Text size
   */
  TextSize?: TextSize;

  /**
   * Whether button action is silent
   */
  Silent?: boolean;

  /**
   * Whether ActionBody is JSON
   */
  isJson?: boolean;
}

/**
 * Update Button Use Case Interface
 *
 * Defines the contract for updating an existing Button within a Keyboard.
 * Use case implementations will implement this interface.
 */
export interface UpdateButtonUseCase {
  /**
   * Execute the update button use case
   *
   * @param input - Input data for updating the button (includes keyboardId and buttonIndex)
   * @returns Promise resolving to the updated ButtonDTO
   * @throws Error if keyboard not found, button index out of bounds, update fails, or validation fails
   */
  execute(input: UpdateButtonInput): Promise<ButtonDTO>;
}
