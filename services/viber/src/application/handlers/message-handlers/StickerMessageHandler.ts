/**
 * Sticker Message Handler
 *
 * Handles sticker messages from Viber users.
 *
 * Location: Application Layer (Hexagonal Architecture)
 */
import { Message } from "viber-bot";
import { Logger } from "@vbar/shared";

export class StickerMessageHandler {
  constructor(private logger: Logger) {}

  async handle(message: Message.Sticker, userProfile: any): Promise<void> {
    this.logger.info("Processing sticker message", {
      userId: userProfile.id,
      stickerId: message.stickerId,
    });
    // TODO: Process sticker message via message processor
  }
}



