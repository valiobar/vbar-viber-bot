/**
 * Text Message Handler
 *
 * Handles text messages from Viber users.
 * Implements prefix-based step triggering:
 * - Checks if message contains buttonsPrefix
 * - Removes prefix if present
 * - Finds matching steps by trigger (case-insensitive)
 * - Sends first matching step to user
 *
 * Location: Application Layer (Hexagonal Architecture)
 */
import { Message } from "viber-bot";
import { Logger } from "@vbar/shared";
import { ViberBotService } from "../../services/ViberBotService";
import { StepSender } from "../../services/StepSender";
import { IUserRepository } from "../../../ports/out/IUserRepository";

export class TextMessageHandler {
  constructor(
    private logger: Logger,
    private viberBotService: ViberBotService | null,
    private stepSender: StepSender,
    private userRepository: IUserRepository
  ) {}

  async handle(message: Message.Text, userProfile: any): Promise<void> {
    this.logger.info("Processing text message", {
      userId: userProfile.id,
      text: message.text,
    });

    // Check if viberBotService is available and initialized
    if (!this.viberBotService || !this.viberBotService.isInitialized()) {
      this.logger.debug(
        "ViberBotService not available, skipping step trigger check",
        {
          userId: userProfile.id,
        }
      );
      return;
    }

    try {
      const settings = this.viberBotService.getSettings();
      if (!settings) {
        this.logger.debug(
          "Bot settings not available, skipping step trigger check",
          {
            userId: userProfile.id,
          }
        );
        return;
      }

      const buttonsPrefix = settings.buttonsPrefix;
      const messageText = message.text;

      // If no prefix configured, skip prefix-based triggering
      if (!buttonsPrefix || buttonsPrefix.trim() === "") {
        this.logger.debug(
          "No buttonsPrefix configured, skipping prefix-based triggering",
          {
            userId: userProfile.id,
          }
        );
        return;
      }

      // Check if message contains prefix (case-insensitive)
      const normalizedPrefix = buttonsPrefix.toLowerCase();
      const normalizedMessageText = messageText.toLowerCase();

      if (!normalizedMessageText.includes(normalizedPrefix)) {
        this.logger.debug(
          "Message does not contain prefix, skipping step trigger",
          {
            userId: userProfile.id,
            prefix: buttonsPrefix,
          }
        );
        return;
      }

      // Remove prefix from message text (case-insensitive removal)
      let cleanedText = messageText;
      const prefixIndex = normalizedMessageText.indexOf(normalizedPrefix);
      if (prefixIndex !== -1) {
        // Remove prefix from original text (preserving original case)
        cleanedText =
          messageText.substring(0, prefixIndex) +
          messageText.substring(prefixIndex + buttonsPrefix.length);
        cleanedText = cleanedText.trim();
      }

      if (!cleanedText) {
        this.logger.debug("Cleaned text is empty after prefix removal", {
          userId: userProfile.id,
        });
        return;
      }

      // Normalize cleaned text to lowercase for matching
      const normalizedCleanedText = cleanedText.toLowerCase();

      // Get BotDataService to find matching steps
      const botDataService = this.viberBotService.getBotDataService();

      // Try exact match first (in case triggers are stored in lowercase)
      let matchingSteps = botDataService.getStepsByTrigger(
        normalizedCleanedText
      );

      // If no exact match, try case-insensitive matching by iterating through all steps
      if (matchingSteps.length === 0) {
        const stepsData = botDataService.getStepsData();
        if (stepsData) {
          for (const step of stepsData.steps.values()) {
            // Check if any trigger matches (case-insensitive)
            for (const trigger of step.trigger) {
              if (trigger.toLowerCase() === normalizedCleanedText) {
                matchingSteps.push(step);
                break; // Found a match for this step, move to next step
              }
            }
          }
        }
      }

      // If steps found, send the first matching step
      if (matchingSteps.length > 0) {
        const stepToSend = matchingSteps[0];
        const bot = this.viberBotService.getBot();

        this.logger.info("Found matching step, sending to user", {
          userId: userProfile.id,
          stepId: stepToSend.id,
          trigger: cleanedText,
          matchingStepsCount: matchingSteps.length,
        });

        await this.stepSender.sendStep(
          stepToSend.id,
          bot,
          userProfile,
          botDataService,
          buttonsPrefix
        );
      } else {
        this.logger.warn("No step found matching trigger", {
          userId: userProfile.id,
          cleanedText,
          normalizedCleanedText,
        });
      }
    } catch (error) {
      // Log error but don't throw - message processing should continue
      this.logger.error("Failed to process text message for step triggering", {
        error: error instanceof Error ? error.message : String(error),
        userId: userProfile.id,
      });
    }
  }
}
