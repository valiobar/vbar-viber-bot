/**
 * Delete Step Use Case Implementation
 *
 * Implements the DeleteStepUseCase interface.
 * This use case deletes a Step entity from the repository.
 * It checks if the step exists before deletion.
 */

import { DeleteStepUseCase } from "../../ports/in/DeleteStepUseCase";
import { StepRepository } from "../../ports/out/StepRepository";

/**
 * Delete Step Use Case Implementation
 *
 * Handles the deletion of Step entities.
 * Note: Validation for step references (e.g., other Steps, Settings) should be
 * implemented when those repositories are available.
 */
export class DeleteStepUseCaseImpl implements DeleteStepUseCase {
  constructor(private readonly stepRepository: StepRepository) {}

  /**
   * Execute the delete step use case
   *
   * @param id - Step ID to delete
   * @returns Promise resolving to void on success
   * @throws Error if step not found, deletion fails, or step is in use
   */
  async execute(id: string): Promise<void> {
    // Check if step exists
    const step = await this.stepRepository.findById(id);

    if (!step) {
      throw new Error(`Step with ID ${id} not found`);
    }

    // TODO: Check if step is referenced by other Steps, Settings, or other entities
    // This requires additional repository methods or cross-domain validation
    // For now, we'll proceed with deletion
    // When those repositories are available, add validation like:
    // const stepReferences = await stepRepository.findByReferencedStepId(id);
    // if (stepReferences.length > 0) {
    //   throw new Error(`Step is referenced by ${stepReferences.length} step(s) and cannot be deleted`);
    // }

    // Delete step via StepRepository
    await this.stepRepository.delete(id);
  }
}

