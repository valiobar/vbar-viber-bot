/**
 * Text Message Handler
 *
 * Handles text messages from Viber users.
 * Implements prefix-based step triggering:
 * - Checks if message contains buttonsPrefix
 * - Removes prefix if present
 * - If cleaned text is a JSON object: merge non-trigger keys into user state,
 *   then dispatch by the `trigger` property
 * - Otherwise find matching steps by the whole cleaned text (case-insensitive)
 * - Sends first matching step to user
 *
 * Location: Application Layer (Hexagonal Architecture)
 */
import { Message } from "viber-bot";
import { Logger, StepDTO } from "@vbar/shared";
import { ViberBotService } from "../../services/ViberBotService";
import { BotDataService } from "../../services/BotDataService";
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

      const botDataService = this.viberBotService.getBotDataService();
      const bot = this.viberBotService.getBot();

      // --- JSON payload path (palms-style button replies) ---
      const jsonPayload = this.parseJsonPayload(cleanedText);
      if (jsonPayload) {
        const { trigger, ...statePatch } = jsonPayload;

        // Merge non-trigger keys into user state BEFORE sending the step
        if (Object.keys(statePatch).length > 0) {
          await this.userRepository.updateState(userProfile.id, statePatch);
          this.logger.info("Merged JSON payload into user state", {
            userId: userProfile.id,
            keys: Object.keys(statePatch),
          });
        }

        if (typeof trigger === "string" && trigger.trim() !== "") {
          const matchingSteps = this.matchStepsByTrigger(
            trigger.trim().toLowerCase(),
            botDataService
          );
          if (matchingSteps.length > 0) {
            await this.stepSender.sendStep(
              matchingSteps[0].id,
              bot,
              userProfile,
              botDataService,
              buttonsPrefix,
              { source: "trigger", trigger: trigger.trim() }
            );
          } else {
            this.logger.warn("No step found matching JSON payload trigger", {
              userId: userProfile.id,
              trigger,
            });
          }
        } else {
          this.logger.warn("JSON payload has no trigger property", {
            userId: userProfile.id,
          });
        }
        return;
      }

      // --- Existing plain trigger path ---
      const normalizedCleanedText = cleanedText.toLowerCase();
      const matchingSteps = this.matchStepsByTrigger(
        normalizedCleanedText,
        botDataService
      );
      if (matchingSteps.length > 0) {
        const stepToSend = matchingSteps[0];

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
          buttonsPrefix,
          { source: "trigger", trigger: cleanedText }
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

  /**
   * Parse text as a JSON object payload (palms IsJsonString equivalent).
   * Returns the object or null if not valid JSON / not a plain object.
   */
  private parseJsonPayload(text: string): Record<string, any> | null {
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, any>;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Find steps whose trigger[] matches the given normalized (lowercase) text.
   * Exact map lookup first, then a case-insensitive scan of all steps.
   */
  private matchStepsByTrigger(
    normalizedTrigger: string,
    botDataService: BotDataService
  ): StepDTO[] {
    let matchingSteps = botDataService.getStepsByTrigger(normalizedTrigger);
    if (matchingSteps.length === 0) {
      const stepsData = botDataService.getStepsData();
      if (stepsData) {
        for (const step of stepsData.steps.values()) {
          for (const trigger of step.trigger) {
            if (trigger.toLowerCase() === normalizedTrigger) {
              matchingSteps.push(step);
              break;
            }
          }
        }
      }
    }
    return matchingSteps;
  }
}
