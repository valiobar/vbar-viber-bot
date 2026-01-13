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
import { IUserRepository } from "../../ports/out/IUserRepository";

export class UnsubscribeHandler implements IEventHandler {
  private logger: Logger;
  private userRepository: IUserRepository;

  constructor(userRepository: IUserRepository, logger?: Logger) {
    this.userRepository = userRepository;
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

      // Update user subscription status
      try {
        const updatedUser = await this.userRepository.updateSubscriptionStatus(
          userId,
          false
        );
        if (updatedUser) {
          this.logger.info("User subscription status updated", {
            userId,
            subscribed: false,
          });
        } else {
          this.logger.warn("User not found for unsubscribe", { userId });
        }
      } catch (error) {
        this.logger.error("Failed to update subscription status", {
          error: error instanceof Error ? error.message : String(error),
          userId,
        });
        // Don't throw - Viber requires quick response
      }
    } catch (error) {
      this.logger.error("Failed to process unsubscription", {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      throw error;
    }
  }
}
