/**
 * Create Step Use Case Interface
 *
 * Input port interface for creating a new Step.
 * This follows Hexagonal Architecture principles.
 */

import { StepDTO } from "../../application/dto/StepDTO";

/**
 * Input data for creating a new Step
 */
export interface CreateStepInput {
  /**
   * Human-readable name for the step
   * Required
   */
  humanReadableName: string;

  /**
   * Array of trigger strings that activate this step
   * Required - must have at least one trigger
   */
  trigger: string[];

  /**
   * Array of Message IDs that are sent when this step is triggered
   * Required - must have at least one Message ID
   */
  content: string[];

  /**
   * Optional Keyboard ID to display with this step
   * If not provided, step will have no keyboard
   */
  keyboard?: string | null;

  /**
   * Whether this step is hidden from lists
   * @default false
   */
  hidden?: boolean;
}

/**
 * Create Step Use Case Interface
 *
 * Defines the contract for creating a new Step.
 * Use case implementations will implement this interface.
 */
export interface CreateStepUseCase {
  /**
   * Execute the create step use case
   *
   * @param input - Input data for creating the step
   * @returns Promise resolving to the created StepDTO
   * @throws Error if step creation fails, validation fails, or referenced entities (Message IDs, Keyboard ID) don't exist
   */
  execute(input: CreateStepInput): Promise<StepDTO>;
}
