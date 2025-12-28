/**
 * Get Step Use Case Interface
 *
 * Input port interface for retrieving a Step by ID.
 * This follows Hexagonal Architecture principles.
 */

import { StepDTO } from "../../application/dto/StepDTO";

/**
 * Get Step Use Case Interface
 *
 * Defines the contract for retrieving a Step by ID.
 * Use case implementations will implement this interface.
 */
export interface GetStepUseCase {
  /**
   * Execute the get step use case
   *
   * @param id - Step ID to retrieve
   * @returns Promise resolving to the StepDTO
   * @throws Error if step not found
   */
  execute(id: string): Promise<StepDTO>;
}

