/**
 * Picture Message Handler
 *
 * Handles picture messages from Viber users.
 *
 * Location: Application Layer (Hexagonal Architecture)
 */
import { Message } from "viber-bot";
import { Logger } from "@vbar/shared";

export class PictureMessageHandler {
  constructor(private logger: Logger) {}

  async handle(message: Message.Picture, userProfile: any): Promise<void> {
    this.logger.info("Processing picture message", {
      userId: userProfile.id,
      pictureUrl: message.picture,
    });
    // TODO: Process picture message via message processor
  }
}

