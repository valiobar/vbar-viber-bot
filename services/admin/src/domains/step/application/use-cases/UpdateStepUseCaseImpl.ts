/**
 * Update Step Use Case Implementation
 *
 * Implements the UpdateStepUseCase interface.
 * This use case updates an existing Step entity, validates referenced entities (Message IDs, Keyboard ID),
 * and saves it to the repository.
 */

import {
  UpdateStepInput,
  UpdateStepUseCase,
} from "../../ports/in/UpdateStepUseCase";
import { StepDTO } from "../dto/StepDTO";
import { Step } from "../../entities/Step";
import { StepRepository } from "../../ports/out/StepRepository";
import { MessageRepository } from "../../../message/ports/out/MessageRepository";
import { KeyboardRepository } from "../../../keyboard/ports/out/KeyboardRepository";

/**
 * Update Step Use Case Implementation
 *
 * Handles the update of existing Step entities with validation of referenced entities.
 */
export class UpdateStepUseCaseImpl implements UpdateStepUseCase {
  constructor(
    private readonly stepRepository: StepRepository,
    private readonly messageRepository: MessageRepository,
    private readonly keyboardRepository: KeyboardRepository
  ) {}

  /**
   * Execute the update step use case
   *
   * @param id - Step ID to update
   * @param input - Input data for updating the step
   * @returns Promise resolving to the updated StepDTO
   * @throws Error if step not found, update fails, validation fails, or referenced entities (Message IDs, Keyboard ID) don't exist
   */
  async execute(id: string, input: UpdateStepInput): Promise<StepDTO> {
    // Get existing step from repository
    const existingStep = await this.stepRepository.findById(id);
    console.log("Input", input);
    if (!existingStep) {
      throw new Error(`Step with ID ${id} not found`);
    }

    // Determine updated values (use input if provided, otherwise keep existing)
    const updatedHumanReadableName =
      input.humanReadableName !== undefined
        ? input.humanReadableName
        : existingStep.humanReadableName;

    const updatedTrigger =
      input.trigger !== undefined ? input.trigger : existingStep.trigger;

    const updatedContent =
      input.content !== undefined ? input.content : existingStep.content;

    // Determine updated keyboard (handle null explicitly to allow removal)
    let updatedKeyboard: string | null;
    if (input.keyboard !== undefined) {
      updatedKeyboard = input.keyboard;
    } else {
      updatedKeyboard = existingStep.keyboard;
    }

    const updatedHidden =
      input.hidden !== undefined ? input.hidden : existingStep.hidden;

    const updatedIsAi =
      input.isAi !== undefined ? input.isAi : existingStep.isAi;

    // Validate all Message IDs exist (if content is being updated)
    if (input.content !== undefined) {
      for (const messageId of updatedContent) {
        const messageExists = await this.messageRepository.exists(messageId);
        if (!messageExists) {
          throw new Error(`Message with ID ${messageId} not found`);
        }
      }
    }

    // Validate Keyboard ID exists if provided (if keyboard is being updated)
    if (input.keyboard !== undefined && updatedKeyboard !== null) {
      const keyboardExists = await this.keyboardRepository.exists(
        updatedKeyboard
      );
      if (!keyboardExists) {
        throw new Error(`Keyboard with ID ${updatedKeyboard} not found`);
      }
    }

    // Create updated Step entity with merged properties
    const updatedStep = new Step({
      id: existingStep.id,
      humanReadableName: updatedHumanReadableName,
      trigger: updatedTrigger,
      content: updatedContent,
      keyboard: updatedKeyboard,
      hidden: updatedHidden,
      isAi: updatedIsAi,
      createdAt: existingStep.createdAt,
      updatedAt: new Date().toISOString(),
    });

    // Save updated step via StepRepository
    const savedStep = await this.stepRepository.update(id, updatedStep);

    // Return StepDTO
    return StepDTO.fromEntity(savedStep);
  }
}
