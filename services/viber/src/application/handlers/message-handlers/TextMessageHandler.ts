/**
 * Text Message Handler
 *
 * Handles text messages from Viber users.
 *
 * Location: Application Layer (Hexagonal Architecture)
 */
import { Message } from "viber-bot";
import { Logger } from "@vbar/shared";

export class TextMessageHandler {
  constructor(private logger: Logger) {}

  async handle(message: Message.Text, userProfile: any): Promise<void> {
    this.logger.info("Processing text message", {
      userId: userProfile.id,
      text: message.text,
    });
    // TODO: Process text message via message processor
  }
}
