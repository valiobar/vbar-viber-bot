/**
 * Create Step Use Case Implementation
 *
 * Implements the CreateStepUseCase interface.
 * This use case creates a new Step entity, validates referenced entities (Message IDs, Keyboard ID),
 * and saves it to the repository.
 */

import {
  CreateStepInput,
  CreateStepUseCase,
} from "../../ports/in/CreateStepUseCase";
import { StepDTO } from "../dto/StepDTO";
import { Step } from "../../entities/Step";
import { StepRepository } from "../../ports/out/StepRepository";
import { MessageRepository } from "../../../message/ports/out/MessageRepository";
import { KeyboardRepository } from "../../../keyboard/ports/out/KeyboardRepository";

/**
 * Create Step Use Case Implementation
 *
 * Handles the creation of new Step entities with validation of referenced entities.
 */
export class CreateStepUseCaseImpl implements CreateStepUseCase {
  constructor(
    private readonly stepRepository: StepRepository,
    private readonly messageRepository: MessageRepository,
    private readonly keyboardRepository: KeyboardRepository
  ) {}

  /**
   * Execute the create step use case
   *
   * @param input - Input data for creating the step
   * @returns Promise resolving to the created StepDTO
   * @throws Error if step creation fails, validation fails, or referenced entities (Message IDs, Keyboard ID) don't exist
   */
  async execute(input: CreateStepInput): Promise<StepDTO> {
    // Validate all Message IDs exist
    for (const messageId of input.content) {
      const messageExists = await this.messageRepository.exists(messageId);
      if (!messageExists) {
        throw new Error(`Message with ID ${messageId} not found`);
      }
    }

    // Validate Keyboard ID exists if provided
    if (input.keyboard !== null && input.keyboard !== undefined) {
      const keyboardExists = await this.keyboardRepository.exists(
        input.keyboard
      );
      if (!keyboardExists) {
        throw new Error(`Keyboard with ID ${input.keyboard} not found`);
      }
    }

    // Create Step entity using factory method
    const step = Step.create({
      humanReadableName: input.humanReadableName,
      trigger: input.trigger,
      content: input.content,
      keyboard: input.keyboard ?? null,
      hidden: input.hidden ?? false,
      isAi: input.isAi ?? false,
    });

    // Save step via StepRepository
    const savedStep = await this.stepRepository.create(step);

    // Return StepDTO
    return StepDTO.fromEntity(savedStep);
  }
}

