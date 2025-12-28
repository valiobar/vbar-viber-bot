/**
 * Get Message Use Case Implementation
 *
 * Implements the GetMessageUseCase interface.
 * This use case retrieves a Message entity by ID from the repository.
 */

import { GetMessageUseCase } from "../../ports/in/GetMessageUseCase";
import { MessageDTO } from "../dto/MessageDTO";
import { MessageRepository } from "../../ports/out/MessageRepository";

/**
 * Get Message Use Case Implementation
 *
 * Handles the retrieval of Message entities by ID.
 */
export class GetMessageUseCaseImpl implements GetMessageUseCase {
  constructor(private readonly messageRepository: MessageRepository) {}

  /**
   * Execute the get message use case
   *
   * @param id - Message ID to retrieve
   * @returns Promise resolving to the MessageDTO
   * @throws Error if message not found
   */
  async execute(id: string): Promise<MessageDTO> {
    // Get message from repository by ID
    const message = await this.messageRepository.findById(id);

    if (!message) {
      throw new Error(`Message with ID ${id} not found`);
    }

    // Convert to DTO
    return MessageDTO.fromEntity(message);
  }
}

