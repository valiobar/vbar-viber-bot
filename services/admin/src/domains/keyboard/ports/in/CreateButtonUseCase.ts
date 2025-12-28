/**
 * Create Button Use Case Interface
 *
 * Input port interface for creating a new Button within a Keyboard.
 * This follows Hexagonal Architecture principles.
 *
 * Buttons are always embedded within Keyboards, so this use case
 * adds a button to an existing keyboard.
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
 * Input data for creating a new Button within a Keyboard
 */
export interface CreateButtonInput {
  /**
   * ID of the keyboard to add the button to
   * Required
   */
  keyboardId: string;

  /**
   * Number of columns the button occupies (1-6)
   * @default 1
   */
  Columns?: number;

  /**
   * Number of rows the button occupies (1-3)
   * @default 1
   */
  Rows?: number;

  /**
   * Button text (with HTML formatting for color)
   * Required
   */
  Text: string;

  /**
   * Text color (hex code)
   * Required
   */
  TextColor: string;

  /**
   * Background color (hex code)
   * Optional
   */
  BgColor?: string | null;

  /**
   * Background media URL
   * Optional
   */
  BgMedia?: string | null;

  /**
   * Background media type
   * @default 'picture'
   */
  BgMediaType?: BgMediaType;

  /**
   * Background media scale type
   * @default 'fit'
   */
  BgMediaScaleType?: string;

  /**
   * Whether background media loops
   * @default true
   */
  BgLoop?: boolean;

  /**
   * Button action type
   * Required
   */
  ActionType: ActionType;

  /**
   * Action body (content depends on ActionType)
   * Required
   */
  ActionBody: string;

  /**
   * URL open type for open-url action
   * @default 'internal'
   */
  OpenURLType?: OpenURLType;

  /**
   * Internal browser configuration for open-url action
   * @default { Mode: 'fullscreen-portrait' }
   */
  InternalBrowser?: InternalBrowserConfig;

  /**
   * Vertical text alignment
   * @default 'middle'
   */
  TextVAlign?: TextVAlign;

  /**
   * Horizontal text alignment
   * @default 'center'
   */
  TextHAlign?: TextHAlign;

  /**
   * Text size
   * @default 'regular'
   */
  TextSize?: TextSize;

  /**
   * Whether button action is silent
   * @default true
   */
  Silent?: boolean;

  /**
   * Whether ActionBody is JSON
   * @default false
   */
  isJson?: boolean;
}

/**
 * Create Button Use Case Interface
 *
 * Defines the contract for creating a new Button within a Keyboard.
 * Use case implementations will implement this interface.
 */
export interface CreateButtonUseCase {
  /**
   * Execute the create button use case
   *
   * @param input - Input data for creating the button
   * @returns Promise resolving to the created ButtonDTO
   * @throws Error if keyboard not found, button creation fails, or validation fails
   */
  execute(input: CreateButtonInput): Promise<ButtonDTO>;
}
