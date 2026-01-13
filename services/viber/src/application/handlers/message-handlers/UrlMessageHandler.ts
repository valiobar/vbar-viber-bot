/**
 * URL Message Handler
 *
 * Handles URL messages from Viber users.
 *
 * Location: Application Layer (Hexagonal Architecture)
 */
import { Message } from "viber-bot";
import { Logger } from "@vbar/shared";

export class UrlMessageHandler {
  constructor(private logger: Logger) {}

  async handle(message: Message.Url, userProfile: any): Promise<void> {
    this.logger.info("Processing URL message", {
      userId: userProfile.id,
      url: message.url,
    });
    // TODO: Process URL message via message processor
  }
}





