/**
 * Video Message Handler
 *
 * Handles video messages from Viber users.
 *
 * Location: Application Layer (Hexagonal Architecture)
 */
import { Message } from "viber-bot";
import { Logger } from "@vbar/shared";

export class VideoMessageHandler {
  constructor(private logger: Logger) {}

  async handle(message: Message.Video, userProfile: any): Promise<void> {
    this.logger.info("Processing video message", {
      userId: userProfile.id,
      videoUrl: message.url,
    });
    // TODO: Process video message via message processor
  }
}
