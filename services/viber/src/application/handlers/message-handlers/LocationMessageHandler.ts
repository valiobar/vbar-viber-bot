/**
 * Location Message Handler
 *
 * Handles location messages from Viber users.
 *
 * Location: Application Layer (Hexagonal Architecture)
 */
import { Message } from "viber-bot";
import { Logger } from "@vbar/shared";

export class LocationMessageHandler {
  constructor(private logger: Logger) {}

  async handle(message: Message.Location, userProfile: any): Promise<void> {
    this.logger.info("Processing location message", {
      userId: userProfile.id,
      location: message.location,
    });
    // TODO: Process location message via message processor
  }
}
