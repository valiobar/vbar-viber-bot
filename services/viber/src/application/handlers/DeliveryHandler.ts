/**
 * Delivery Handler
 *
 * Handles message delivery status events (delivered and seen).
 * Updates message status in the system for tracking and analytics.
 *
 * Location: Application Layer (Hexagonal Architecture)
 *
 * Note: viber-bot package provides onSeen() but may not have onDelivered().
 * Delivered events may need to be handled via raw webhook events in future.
 */
import { Bot } from "viber-bot";
import { IEventHandler } from "./IEventHandler";
import { ConsoleLogger, Logger } from "@vbar/shared";

export class DeliveryHandler implements IEventHandler {
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || new ConsoleLogger("DeliveryHandler");
  }

  getName(): string {
    return "DeliveryHandler";
  }

  register(bot: Bot): void {
    // Register seen event handler (confirmed available in viber-bot)
    bot.onSeen((messageId: string, userId: string) => {
      this.handleSeen(messageId, userId).catch((error) => {
        this.logger.error("Error handling seen event", {
          error,
          messageId,
          userId,
        });
        // Don't throw - we've already acknowledged to Viber
      });
    });

    // Note: viber-bot may not have onDelivered() method
    // Delivered events may need to be handled via raw webhook events
    // This will be addressed in future steps if needed

    this.logger.info("Delivery handler registered");
  }

  private async handleSeen(messageId: string, userId: string): Promise<void> {
    try {
      // Log seen event
      this.logger.info("Message seen", {
        messageId,
        userId,
        timestamp: new Date().toISOString(),
      });

      // TODO: In future steps, update message status via IMessageRepository port
      // const messageRepository = this.messageRepository;
      // await messageRepository.updateStatus(messageId, {
      //   status: "seen",
      //   seenAt: new Date(),
      // });
    } catch (error) {
      this.logger.error("Failed to process seen event", {
        error: error instanceof Error ? error.message : String(error),
        messageId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Handle delivered event
   *
   * Note: This method may need to be called from raw webhook handler
   * if viber-bot doesn't provide onDelivered() method.
   *
   * @param messageId Message token/ID
   * @param userId User ID
   */
  async handleDelivered(messageId: string, userId: string): Promise<void> {
    try {
      // Log delivered event
      this.logger.info("Message delivered", {
        messageId,
        userId,
        timestamp: new Date().toISOString(),
      });

      // TODO: In future steps, update message status via IMessageRepository port
      // const messageRepository = this.messageRepository;
      // await messageRepository.updateStatus(messageId, {
      //   status: "delivered",
      //   deliveredAt: new Date(),
      // });
    } catch (error) {
      this.logger.error("Failed to process delivered event", {
        error: error instanceof Error ? error.message : String(error),
        messageId,
        userId,
      });
      throw error;
    }
  }
}
