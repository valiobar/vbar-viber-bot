/**
 * Find Steps By Trigger Use Case Interface
 *
 * Input port interface for finding Steps by a specific trigger string.
 * This follows Hexagonal Architecture principles.
 */

import { StepDTO } from "../../application/dto/StepDTO";

/**
 * Find Steps By Trigger Use Case Interface
 *
 * Defines the contract for finding Steps that contain a specific trigger string.
 * Use case implementations will implement this interface.
 */
export interface FindStepsByTriggerUseCase {
  /**
   * Execute the find steps by trigger use case
   *
   * @param trigger - Trigger string to search for (case-insensitive match)
   * @returns Promise resolving to array of StepDTOs that contain the trigger
   * @throws Error if search fails
   */
  execute(trigger: string): Promise<StepDTO[]>;
}

