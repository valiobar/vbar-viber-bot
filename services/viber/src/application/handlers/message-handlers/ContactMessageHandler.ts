/**
 * Contact Message Handler
 *
 * Handles contact messages from Viber users.
 *
 * Location: Application Layer (Hexagonal Architecture)
 */
import { Message } from "viber-bot";
import { Logger } from "@vbar/shared";

export class ContactMessageHandler {
  constructor(private logger: Logger) {}

  async handle(message: Message.Contact, userProfile: any): Promise<void> {
    this.logger.info("Processing contact message", {
      userId: userProfile.id,
      contactName: message.contactName,
      contactPhoneNumber: message.contactPhoneNumber,
    });
    // TODO: Process contact message via message processor
  }
}
