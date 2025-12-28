/**
 * Create Message Use Case Implementation
 *
 * Implements the CreateMessageUseCase interface.
 * This use case creates a new Message entity, validates it, and saves it to the repository.
 */

import {
  CreateMessageInput,
  CreateMessageUseCase,
} from "../../ports/in/CreateMessageUseCase";
import { MessageDTO } from "../dto/MessageDTO";
import { Message } from "../../entities/Message";
import { MessageRepository } from "../../ports/out/MessageRepository";

/**
 * Create Message Use Case Implementation
 *
 * Handles the creation of new Message entities with validation.
 */
export class CreateMessageUseCaseImpl implements CreateMessageUseCase {
  constructor(private readonly messageRepository: MessageRepository) {}

  /**
   * Execute the create message use case
   *
   * @param input - Input data for creating the message
   * @returns Promise resolving to the created MessageDTO
   * @throws Error if message creation fails or validation fails
   */
  async execute(input: CreateMessageInput): Promise<MessageDTO> {
    // Create Message entity using factory method
    const message = Message.create({
      type: input.type,
      content: input.content,
      url: input.url ?? null,
      humanReadableName: input.humanReadableName,
      hidden: input.hidden ?? false,
    });

    // Save message via MessageRepository
    const savedMessage = await this.messageRepository.create(message);

    // Return MessageDTO
    return MessageDTO.fromEntity(savedMessage);
  }
}

