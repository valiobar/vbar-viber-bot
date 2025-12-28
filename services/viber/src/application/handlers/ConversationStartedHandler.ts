/**
 * Conversation Started Handler
 *
 * Handles conversation started events when users start a conversation with the bot.
 * Processes context parameters and initializes conversation flow.
 *
 * Location: Application Layer (Hexagonal Architecture)
 */
import { Bot } from "viber-bot";
import { IEventHandler } from "./IEventHandler";
import { ConsoleLogger, Logger } from "@vbar/shared";
import { IUserRepository } from "../../ports/out/IUserRepository";

export class ConversationStartedHandler implements IEventHandler {
  private logger: Logger;
  private userRepository: IUserRepository;

  constructor(userRepository: IUserRepository, logger?: Logger) {
    this.userRepository = userRepository;
    this.logger = logger || new ConsoleLogger("ConversationStartedHandler");
  }

  getName(): string {
    return "ConversationStartedHandler";
  }

  register(bot: Bot): void {
    bot.onConversationStarted(
      (
        userProfile: any,
        isSubscribed: boolean,
        context: string | null,
        onFinish: () => void
      ) => {
        this.handleConversationStarted(
          userProfile,
          isSubscribed,
          context,
          onFinish
        ).catch((error) => {
          this.logger.error("Error handling conversation started", { error });
          // Always call onFinish even on error
          onFinish();
        });
      }
    );

    this.logger.info("Conversation started handler registered");
  }

  private async handleConversationStarted(
    userProfile: any,
    isSubscribed: boolean,
    context: string | null,
    onFinish: () => void
  ): Promise<void> {
    try {
      const userId = userProfile.id;
      const userName = userProfile.name;

      // Ensure user exists in database
      try {
        let user = await this.userRepository.findByViberId(userId);
        if (!user) {
          // Create user if doesn't exist
          user = await this.userRepository.createOrUpdate({
            viberId: userId,
            name: userName,
            avatar: userProfile.avatar,
            language: userProfile.language,
            country: userProfile.country,
            apiVersion: userProfile.apiVersion,
            subscribed: isSubscribed,
            subscribedAt: isSubscribed ? new Date() : undefined,
          });
          this.logger.info("User created on conversation start", { userId });
        } else if (isSubscribed && !user.subscribed) {
          // Update subscription status if user is now subscribed
          await this.userRepository.updateSubscriptionStatus(userId, true);
        }
      } catch (error) {
        this.logger.error("Failed to ensure user exists", {
          error: error instanceof Error ? error.message : String(error),
          userId,
        });
        // Don't throw - continue processing conversation start
      }

      // Log conversation start
      this.logger.info("Conversation started", {
        userId,
        userName,
        isSubscribed,
        context,
        timestamp: new Date().toISOString(),
      });

      // Parse context if provided (may contain trigger information)
      let parsedContext: Record<string, any> | null = null;
      if (context) {
        try {
          parsedContext = JSON.parse(context);
          this.logger.debug("Parsed conversation context", {
            userId,
            context: parsedContext,
          });
        } catch (error) {
          this.logger.warn("Failed to parse conversation context", {
            userId,
            context,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // TODO: In future steps, initialize conversation via repository
      // const conversationRepository = this.conversationRepository;
      // await conversationRepository.create({
      //   viberUserId: userId,
      //   status: "active",
      //   context: parsedContext || {},
      //   startedAt: new Date(),
      // });

      // TODO: In future steps, trigger welcome flow
      // if (isSubscribed) {
      //   const messageSender = this.messageSender;
      //   await messageSender.sendWelcomeMessage(userId, parsedContext);
      // }

      // Call onFinish callback (required by viber-bot)
      onFinish();
    } catch (error) {
      this.logger.error("Failed to process conversation started", {
        error: error instanceof Error ? error.message : String(error),
        userId: userProfile?.id,
      });
      // Always call onFinish even on error
      onFinish();
      throw error;
    }
  }
}
