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
   * @param userProfile - User profile (optional, for future use)
   */
  async handleMessage(
    messageContent: string,
    messageType: string,
    userId: string,
    stepId: string,
    userProfile?: any
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
      });

      // Log the response
      console.log("ViberAiService - AI response received:", response);
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
