/**
 * Subscribe Handler
 *
 * Handles user subscription events when users subscribe to the bot.
 * Extracts user profile information and initializes user in the system.
 *
 * Location: Application Layer (Hexagonal Architecture)
 */
import { Bot } from "viber-bot";
import { IEventHandler } from "./IEventHandler";
import { ConsoleLogger, Logger } from "@vbar/shared";
import { IUserRepository } from "../../ports/out/IUserRepository";

export class SubscribeHandler implements IEventHandler {
  private logger: Logger;
  private userRepository: IUserRepository;

  constructor(userRepository: IUserRepository, logger?: Logger) {
    this.userRepository = userRepository;
    this.logger = logger || new ConsoleLogger("SubscribeHandler");
  }

  getName(): string {
    return "SubscribeHandler";
  }

  register(bot: Bot): void {
    bot.onSubscribe((response: any) => {
      this.handleSubscribe(response).catch((error) => {
        this.logger.error("Error handling subscription", { error });
        // Don't throw - we've already acknowledged to Viber
      });
    });

    this.logger.info("Subscribe handler registered");
  }

  private async handleSubscribe(response: any): Promise<void> {
    try {
      const userProfile = response.userProfile;
      const userId = userProfile.id;
      const userName = userProfile.name;
      const avatar = userProfile.avatar;
      const language = userProfile.language;
      const country = userProfile.country;

      // Log subscription event
      this.logger.info("User subscribed", {
        userId,
        userName,
        avatar,
        language,
        country,
        timestamp: new Date().toISOString(),
      });
      console.log("userProfile", userProfile);
      // Create or update user with subscription status
      try {
        await this.userRepository.createOrUpdate({
          viberId: userId,
          name: userName,
          avatar,
          language,
          country,
          apiVersion: userProfile.apiVersion,
          subscribed: true,
          subscribedAt: new Date(),
        });
        this.logger.info("User created/updated in database", { userId });
      } catch (error) {
        this.logger.error("Failed to create/update user", {
          error: error instanceof Error ? error.message : String(error),
          userId,
        });
        // Don't throw - Viber requires quick response
      }

      // TODO: In future steps, send welcome message via message sender
      // const messageSender = this.messageSender;
      // await messageSender.sendWelcomeMessage(userId);
    } catch (error) {
      this.logger.error("Failed to process subscription", {
        error: error instanceof Error ? error.message : String(error),
        userId: response.userProfile?.id,
      });
      throw error;
    }
  }
}
