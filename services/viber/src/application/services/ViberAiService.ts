/**
 * Viber AI Service
 *
 * Handles AI processing for messages when user is in an AI step.
 * Calls the AI service via gRPC to process messages.
 *
 * Location: Application Layer (Hexagonal Architecture)
 */

import { Logger } from "@vbar/shared";
import { IAiServiceClient } from "../../ports/out/IAiServiceClient";
import { Bot, Message } from "viber-bot";

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
   */
  async handleMessage(
    messageContent: string,
    messageType: string,
    userId: string,
    stepId: string,
    bot: Bot,
    userProfile: any,
    taskType?: string
  ): Promise<void> {
    try {
      // Call AI service via gRPC client
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
      });

      // Log the response
      this.logger.info("ViberAiService - AI response received", {
        userId,
        stepId,
        responseLength: response.response?.length || 0,
      });

      // Send AI response back to user
      if (response && response.response) {
        const textMessage = new Message.Text(response.response);
        await bot.sendMessage(userProfile, [textMessage]);

        this.logger.info("ViberAiService - AI response sent to user", {
          userId,
          stepId,
        });
      } else {
        this.logger.warn("ViberAiService - Empty AI response, not sending", {
          userId,
          stepId,
        });
      }
    } catch (error) {
      this.logger.error("Failed to process message via AI service", {
        error: error instanceof Error ? error.message : String(error),
        userId,
        stepId,
        messageType,
      });
      // Don't throw - allow message processing to continue even if AI service fails
    }
  }
}
