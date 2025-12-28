/**
 * Update Message Use Case Implementation
 *
 * Implements the UpdateMessageUseCase interface.
 * This use case updates an existing Message entity, validates it, and saves it to the repository.
 */

import {
  UpdateMessageInput,
  UpdateMessageUseCase,
} from "../../ports/in/UpdateMessageUseCase";
import { MessageDTO } from "../dto/MessageDTO";
import { Message } from "../../entities/Message";
import { MessageContent } from "../../value-objects/MessageContent";
import { MessageRepository } from "../../ports/out/MessageRepository";

/**
 * Update Message Use Case Implementation
 *
 * Handles the update of existing Message entities with validation.
 */
export class UpdateMessageUseCaseImpl implements UpdateMessageUseCase {
  constructor(private readonly messageRepository: MessageRepository) {}

  /**
   * Execute the update message use case
   *
   * @param id - Message ID to update
   * @param input - Input data for updating the message
   * @returns Promise resolving to the updated MessageDTO
   * @throws Error if message not found, update fails, or validation fails
   */
  async execute(id: string, input: UpdateMessageInput): Promise<MessageDTO> {
    // Get existing message from repository
    const existingMessage = await this.messageRepository.findById(id);

    if (!existingMessage) {
      throw new Error(`Message with ID ${id} not found`);
    }

    // Determine updated type (use input type if provided, otherwise keep existing)
    const updatedType = input.type ?? existingMessage.type;

    // Determine updated content
    let updatedContent: MessageContent;
    if (input.content !== undefined) {
      // Create new MessageContent from input content
      updatedContent = new MessageContent(updatedType, input.content);
    } else {
      // Keep existing content
      updatedContent = existingMessage.content;
    }

    // Determine updated URL
    const updatedUrl =
      input.url !== undefined ? input.url : existingMessage.url;

    // Create updated Message entity with merged properties
    const updatedMessage = new Message({
      id: existingMessage.id,
      type: updatedType,
      content: updatedContent,
      url: updatedUrl,
      humanReadableName:
        input.humanReadableName !== undefined
          ? input.humanReadableName
          : existingMessage.humanReadableName,
      hidden:
        input.hidden !== undefined ? input.hidden : existingMessage.hidden,
      createdAt: existingMessage.createdAt,
      updatedAt: new Date().toISOString(),
    });

    // Save updated message via MessageRepository
    const savedMessage = await this.messageRepository.update(
      id,
      updatedMessage
    );

    // Return MessageDTO
    return MessageDTO.fromEntity(savedMessage);
  }
}
