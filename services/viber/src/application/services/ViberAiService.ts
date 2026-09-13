/**
 * Viber AI Service
 *
 * Handles AI processing for messages when user is in an AI step.
 * Calls the AI service via gRPC to process messages.
 *
 * Location: Application Layer (Hexagonal Architecture)
 */

import { ConfigHelper, Logger } from "@vbar/shared";
import { IAiServiceClient } from "../../ports/out/IAiServiceClient";
import { Bot, Message } from "viber-bot";
import { buildDismissKeyboard, buildThinkingKeyboard } from "./thinkingKeyboard";
import {
  buildRichMediaFromCards,
  parseAiCarouselDirective,
} from "./AiCarouselDirective";

const MIN_API_VERSION = 7;

export class ViberAiService {
  constructor(
    private logger: Logger,
    private aiServiceClient: IAiServiceClient
  ) {}

  /**
   * Handle message for AI processing
   *
   * @param messageContent - Extracted content from the message (text, URL, etc.)
   * @param messageType - Type of message (text, picture, video, file, location, contact, sticker, url)
   * @param userId - Viber user ID
   * @param stepId - Current step ID
   * @param bot - Viber Bot instance for sending messages
   * @param userProfile - User profile for sending messages
   * @param taskType - Task type: "simple", "rag", or "custom" (optional)
   * @param promptName - Per-step prompt override (optional)
   * @param restoreKeyboard - Converted Viber keyboard to attach after the AI reply
   */
  async handleMessage(
    messageContent: string,
    messageType: string,
    userId: string,
    stepId: string,
    bot: Bot,
    userProfile: any,
    taskType?: string,
    promptName?: string,
    restoreKeyboard?: object
  ): Promise<void> {
    const gifUrl = ConfigHelper.getEnv("AI_THINKING_GIF_URL", "").trim();
    const followUpKeyboard = restoreKeyboard ?? buildDismissKeyboard();
    let thinkingSent = false;

    if (gifUrl) {
      try {
        const thinking = new (Message.Keyboard as any)(
          buildThinkingKeyboard(gifUrl),
          null,
          null,
          null,
          MIN_API_VERSION
        );
        await bot.sendMessage(userProfile, [thinking]);
        thinkingSent = true;
        this.logger.info("ViberAiService - thinking indicator sent", {
          userId,
          stepId,
        });
      } catch (error) {
        this.logger.warn("ViberAiService - failed to send thinking indicator", {
          error: error instanceof Error ? error.message : String(error),
          userId,
          stepId,
        });
      }
    }

    try {
      const response = await this.aiServiceClient.processMessage({
        messageContent,
        messageType,
        userId,
        stepId,
        userProfile: userProfile
          ? {
              id: userProfile.id,
              name: userProfile.name,
              avatar: userProfile.avatar,
            }
          : undefined,
        taskType,
        promptName,
      });

      this.logger.info("ViberAiService - AI response received", {
        userId,
        stepId,
        responseLength: response.response?.length || 0,
      });

      const text =
        response && response.response && response.response.trim()
          ? response.response
          : "";

      if (!text) {
        this.logger.warn("ViberAiService - Empty AI response, not sending", {
          userId,
          stepId,
        });
        if (thinkingSent) {
          try {
            await this.sendRestoreKeyboard(bot, userProfile, followUpKeyboard);
          } catch (sendError) {
            this.logger.error("ViberAiService - failed to send AI fallback", {
              error:
                sendError instanceof Error
                  ? sendError.message
                  : String(sendError),
              userId,
              stepId,
            });
          }
        }
        return;
      }

      // Carousel directive path: a JSON reply renders as rich media
      const directive = parseAiCarouselDirective(text);
      if (!directive && text.includes('"carousel"')) {
        this.logger.warn(
          "ViberAiService - reply looks like a carousel directive but failed to parse/validate, sending as text",
          {
            userId,
            stepId,
            replyPreview: text.slice(0, 300),
          }
        );
      }
      if (directive) {
        const richMedia = buildRichMediaFromCards(directive.cards);
        const messages: any[] = [];
        if (directive.text) {
          messages.push(
            new (Message.Text as any)(
              directive.text,
              null,
              null,
              null,
              null,
              MIN_API_VERSION
            )
          );
        }
        // Message.RichMedia(richMedia, keyboard, trackingData, timestamp, token, minApiVersion)
        // Rich media requires min_api_version >= 7; MIN_API_VERSION satisfies it
        messages.push(
          new (Message.RichMedia as any)(
            richMedia,
            followUpKeyboard,
            null,
            null,
            null,
            MIN_API_VERSION
          )
        );
        await bot.sendMessage(userProfile, messages);
        this.logger.info("ViberAiService - AI carousel response sent to user", {
          userId,
          stepId,
          cardCount: directive.cards.length,
        });
        return;
      }

      const reply = new (Message.Text as any)(
        text,
        followUpKeyboard,
        null,
        null,
        null,
        MIN_API_VERSION
      );
      await bot.sendMessage(userProfile, [reply]);
      this.logger.info("ViberAiService - AI response sent to user", {
        userId,
        stepId,
      });
    } catch (error) {
      this.logger.error("Failed to process message via AI service", {
        error: error instanceof Error ? error.message : String(error),
        userId,
        stepId,
        messageType,
      });
      if (thinkingSent) {
        try {
          await this.sendRestoreKeyboard(bot, userProfile, followUpKeyboard);
        } catch (sendError) {
          this.logger.error("ViberAiService - failed to send AI fallback", {
            error:
              sendError instanceof Error
                ? sendError.message
                : String(sendError),
            userId,
            stepId,
          });
        }
      }
    }
  }

  private async sendRestoreKeyboard(
    bot: Bot,
    userProfile: any,
    keyboard: object
  ): Promise<void> {
    const restore = new (Message.Keyboard as any)(
      keyboard,
      null,
      null,
      null,
      MIN_API_VERSION
    );
    await bot.sendMessage(userProfile, [restore]);
  }
}
