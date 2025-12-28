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

export class ConversationStartedHandler implements IEventHandler {
  private logger: Logger;

  constructor(logger?: Logger) {
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
