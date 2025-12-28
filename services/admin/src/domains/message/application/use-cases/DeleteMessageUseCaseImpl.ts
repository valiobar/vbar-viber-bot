/**
 * Delete Message Use Case Implementation
 *
 * Implements the DeleteMessageUseCase interface.
 * This use case deletes a Message entity from the repository.
 * It checks if the message exists before deletion.
 */

import { DeleteMessageUseCase } from "../../ports/in/DeleteMessageUseCase";
import { MessageRepository } from "../../ports/out/MessageRepository";

/**
 * Delete Message Use Case Implementation
 *
 * Handles the deletion of Message entities.
 * Note: Validation for message references (e.g., Steps, Settings) should be
 * implemented when those repositories are available.
 */
export class DeleteMessageUseCaseImpl implements DeleteMessageUseCase {
  constructor(private readonly messageRepository: MessageRepository) {}

  /**
   * Execute the delete message use case
   *
   * @param id - Message ID to delete
   * @returns Promise resolving to void on success
   * @throws Error if message not found, deletion fails, or message is in use
   */
  async execute(id: string): Promise<void> {
    // Check if message exists
    const message = await this.messageRepository.findById(id);

    if (!message) {
      throw new Error(`Message with ID ${id} not found`);
    }

    // TODO: Check if message is referenced by Steps, Settings, or other entities
    // This requires StepRepository, SettingRepository, etc.
    // For now, we'll proceed with deletion
    // When those repositories are available, add validation like:
    // const stepReferences = await stepRepository.findByMessageId(id);
    // if (stepReferences.length > 0) {
    //   throw new Error(`Message is referenced by ${stepReferences.length} step(s) and cannot be deleted`);
    // }

    // Delete message via MessageRepository
    await this.messageRepository.delete(id);
  }
}

