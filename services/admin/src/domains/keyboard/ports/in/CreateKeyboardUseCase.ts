/**
 * Create Keyboard Use Case Interface
 *
 * Input port interface for creating a new Keyboard.
 * This follows Hexagonal Architecture principles.
 */

import { KeyboardDTO } from "../../application/dto/KeyboardDTO";
import { ButtonDTO } from "../../application/dto/ButtonDTO";
import { InputFieldState } from "../../types";

/**
 * Input data for creating a new Keyboard
 */
export interface CreateKeyboardInput {
  /**
   * Array of Button DTOs for the keyboard
   */
  Buttons: Omit<ButtonDTO, "id" | "createdAt" | "updatedAt">[];

  /**
   * Whether keyboard uses default height
   * @default false
   */
  DefaultHeight?: boolean;

  /**
   * Input field state
   * @default 'hidden'
   */
  InputFieldState?: InputFieldState;

  /**
   * Background color (hex code)
   * Optional
   */
  BgColor?: string | null;

  /**
   * Human-readable name for the keyboard
   * Required
   */
  humanReadableName: string;

  /**
   * Optional title for the keyboard
   */
  title?: string | null;

  /**
   * Whether this keyboard is for broadcast messages
   * @default false
   */
  isBroadcast?: boolean;

  /**
   * Whether this keyboard is hidden from lists
   * @default false
   */
  hidden?: boolean;
}

/**
 * Create Keyboard Use Case Interface
 *
 * Defines the contract for creating a new Keyboard.
 * Use case implementations will implement this interface.
 */
export interface CreateKeyboardUseCase {
  /**
   * Execute the create keyboard use case
   *
   * @param input - Input data for creating the keyboard
   * @returns Promise resolving to the created KeyboardDTO
   * @throws Error if keyboard creation fails or validation fails
   */
  execute(input: CreateKeyboardInput): Promise<KeyboardDTO>;
}

