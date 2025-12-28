/**
 * Update Step Use Case Interface
 *
 * Input port interface for updating an existing Step.
 * This follows Hexagonal Architecture principles.
 */

import { StepDTO } from "../../application/dto/StepDTO";

/**
 * Input data for updating an existing Step
 */
export interface UpdateStepInput {
  /**
   * Human-readable name for the step
   * Optional - if not provided, name remains unchanged
   */
  humanReadableName?: string;

  /**
   * Array of trigger strings that activate this step
   * Optional - if not provided, triggers remain unchanged
   */
  trigger?: string[];

  /**
   * Array of Message IDs that are sent when this step is triggered
   * Optional - if not provided, content remains unchanged
   */
  content?: string[];

  /**
   * Optional Keyboard ID to display with this step
   * Optional - if not provided, keyboard remains unchanged
   * Set to null to remove keyboard
   */
  keyboard?: string | null;

  /**
   * Whether this step is hidden from lists
   * Optional - if not provided, hidden status remains unchanged
   */
  hidden?: boolean;
}

/**
 * Update Step Use Case Interface
 *
 * Defines the contract for updating an existing Step.
 * Use case implementations will implement this interface.
 */
export interface UpdateStepUseCase {
  /**
   * Execute the update step use case
   *
   * @param id - Step ID to update
   * @param input - Input data for updating the step
   * @returns Promise resolving to the updated StepDTO
   * @throws Error if step not found, update fails, validation fails, or referenced entities (Message IDs, Keyboard ID) don't exist
   */
  execute(id: string, input: UpdateStepInput): Promise<StepDTO>;
}

