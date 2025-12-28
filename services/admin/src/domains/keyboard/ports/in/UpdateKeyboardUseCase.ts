/**
 * Update Keyboard Use Case Interface
 *
 * Input port interface for updating an existing Keyboard.
 * This follows Hexagonal Architecture principles.
 */

import { KeyboardDTO } from "../../application/dto/KeyboardDTO";
import { ButtonDTO } from "../../application/dto/ButtonDTO";
import { InputFieldState } from "../../types";

/**
 * Input data for updating an existing Keyboard
 */
export interface UpdateKeyboardInput {
  /**
   * Array of Button DTOs for the keyboard
   * Optional - if not provided, buttons remain unchanged
   */
  Buttons?: Omit<ButtonDTO, "id" | "createdAt" | "updatedAt">[];

  /**
   * Whether keyboard uses default height
   */
  DefaultHeight?: boolean;

  /**
   * Input field state
   */
  InputFieldState?: InputFieldState;

  /**
   * Background color (hex code)
   */
  BgColor?: string | null;

  /**
   * Human-readable name for the keyboard
   */
  humanReadableName?: string;

  /**
   * Optional title for the keyboard
   */
  title?: string | null;

  /**
   * Whether this keyboard is for broadcast messages
   */
  isBroadcast?: boolean;

  /**
   * Whether this keyboard is hidden from lists
   */
  hidden?: boolean;
}

/**
 * Update Keyboard Use Case Interface
 *
 * Defines the contract for updating an existing Keyboard.
 * Use case implementations will implement this interface.
 */
export interface UpdateKeyboardUseCase {
  /**
   * Execute the update keyboard use case
   *
   * @param id - Keyboard ID to update
   * @param input - Input data for updating the keyboard
   * @returns Promise resolving to the updated KeyboardDTO
   * @throws Error if keyboard not found, update fails, or validation fails
   */
  execute(id: string, input: UpdateKeyboardInput): Promise<KeyboardDTO>;
}

