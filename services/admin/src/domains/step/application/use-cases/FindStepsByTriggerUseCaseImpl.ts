/**
 * Find Steps By Trigger Use Case Implementation
 *
 * Implements the FindStepsByTriggerUseCase interface.
 * This use case finds Step entities that contain a specific trigger string.
 */

import { FindStepsByTriggerUseCase } from "../../ports/in/FindStepsByTriggerUseCase";
import { StepDTO } from "../dto/StepDTO";
import { StepRepository } from "../../ports/out/StepRepository";

/**
 * Find Steps By Trigger Use Case Implementation
 *
 * Handles finding Step entities by trigger string.
 * Used by bot service to find steps that match a specific trigger.
 */
export class FindStepsByTriggerUseCaseImpl
  implements FindStepsByTriggerUseCase
{
  constructor(private readonly stepRepository: StepRepository) {}

  /**
   * Execute the find steps by trigger use case
   *
   * @param trigger - Trigger string to search for (case-insensitive match)
   * @returns Promise resolving to array of StepDTOs that contain the trigger
   * @throws Error if search fails
   */
  async execute(trigger: string): Promise<StepDTO[]> {
    // Find steps by trigger via repository
    const steps = await this.stepRepository.findByTrigger(trigger);

    // Convert entities to DTOs
    return steps.map((step) => StepDTO.fromEntity(step));
  }
}
