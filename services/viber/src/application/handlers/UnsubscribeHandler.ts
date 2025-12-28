/**
 * Unsubscribe Handler
 *
 * Handles user unsubscription events when users unsubscribe from the bot.
 * Updates user subscription status in the system.
 *
 * Location: Application Layer (Hexagonal Architecture)
 */
import { Bot } from "viber-bot";
import { IEventHandler } from "./IEventHandler";
import { ConsoleLogger, Logger } from "@vbar/shared";

export class UnsubscribeHandler implements IEventHandler {
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || new ConsoleLogger("UnsubscribeHandler");
  }

  getName(): string {
    return "UnsubscribeHandler";
  }

  register(bot: Bot): void {
    bot.onUnsubscribe((userId: string) => {
      this.handleUnsubscribe(userId).catch((error) => {
        this.logger.error("Error handling unsubscription", { error, userId });
        // Don't throw - we've already acknowledged to Viber
      });
    });

    this.logger.info("Unsubscribe handler registered");
  }

  private async handleUnsubscribe(userId: string): Promise<void> {
    try {
      // Log unsubscribe event
      this.logger.info("User unsubscribed", {
        userId,
        timestamp: new Date().toISOString(),
      });

      // TODO: In future steps, update user subscription status via IUserRepository port
      // const userRepository = this.userRepository;
      // await userRepository.updateSubscriptionStatus(userId, {
      //   subscribed: false,
      //   unsubscribedAt: new Date(),
      // });
    } catch (error) {
      this.logger.error("Failed to process unsubscription", {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      throw error;
    }
  }
}
