/**
 * File Message Handler
 *
 * Handles file messages from Viber users.
 *
 * Location: Application Layer (Hexagonal Architecture)
 */
import { Message } from "viber-bot";
import { Logger } from "@vbar/shared";

export class FileMessageHandler {
  constructor(private logger: Logger) {}

  async handle(message: Message.File, userProfile: any): Promise<void> {
    this.logger.info("Processing file message", {
      userId: userProfile.id,
      fileUrl: message.media,
      fileName: message.file_name,
      fileSize: message.size,
    });
    // TODO: Process file message via message processor
  }
}

