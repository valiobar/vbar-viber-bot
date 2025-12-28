/**
 * Get Step Use Case Implementation
 *
 * Implements the GetStepUseCase interface.
 * This use case retrieves a Step entity by ID from the repository.
 */

import { GetStepUseCase } from "../../ports/in/GetStepUseCase";
import { StepDTO } from "../dto/StepDTO";
import { StepRepository } from "../../ports/out/StepRepository";

/**
 * Get Step Use Case Implementation
 *
 * Handles the retrieval of Step entities by ID.
 */
export class GetStepUseCaseImpl implements GetStepUseCase {
  constructor(private readonly stepRepository: StepRepository) {}

  /**
   * Execute the get step use case
   *
   * @param id - Step ID to retrieve
   * @returns Promise resolving to the StepDTO
   * @throws Error if step not found
   */
  async execute(id: string): Promise<StepDTO> {
    // Get step from repository by ID
    const step = await this.stepRepository.findById(id);

    if (!step) {
      throw new Error(`Step with ID ${id} not found`);
    }

    // Convert to DTO
    return StepDTO.fromEntity(step);
  }
}

