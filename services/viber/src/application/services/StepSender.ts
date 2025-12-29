/**
 * Step Sender Service
 *
 * Sends step messages and keyboard to Viber users.
 * Retrieves step data, converts messages and keyboard, and sends them via Viber Bot.
 *
 * Location: Application layer (Hexagonal Architecture)
 */

import { Bot } from "viber-bot";
import { BotDataService } from "./BotDataService";
import { MessageConverter } from "./MessageConverter";
import { KeyboardConverter } from "./KeyboardConverter";
import { Logger, ConsoleLogger } from "@vbar/shared";
import { IUserRepository } from "../../ports/out/IUserRepository";

/**
 * Step Sender Service
 *
 * Orchestrates sending step messages and keyboard to users:
 * - Retrieves step from BotDataService
 * - Retrieves messages referenced in step.content
 * - Retrieves keyboard if step.keyboard is set
 * - Converts messages and keyboard to Viber format
 * - Sends messages via bot.sendMessage()
 */
export class StepSender {
  private messageConverter: MessageConverter;
  private keyboardConverter: KeyboardConverter;
  private userRepository: IUserRepository;
  private logger: Logger;

  constructor(userRepository: IUserRepository, logger?: Logger) {
    this.logger = logger || new ConsoleLogger("StepSender");
    this.userRepository = userRepository;
    this.messageConverter = new MessageConverter(this.logger);
    this.keyboardConverter = new KeyboardConverter(this.logger);
  }

  /**
   * Send step messages and keyboard to a user
   *
   * @param stepId - Step ID to send
   * @param bot - Viber Bot instance
   * @param userProfile - User profile object (must have id property)
   * @param botDataService - BotDataService instance for retrieving step data
   * @param buttonPrefix - Optional button prefix from bot settings
   * @returns Promise that resolves when messages are sent
   */
  async sendStep(
    stepId: string,
    bot: Bot,
    userProfile: any,
    botDataService: BotDataService,
    buttonPrefix?: string | null
  ): Promise<void> {
    try {
      // Retrieve step from BotDataService
      const step = botDataService.getStepById(stepId);
      if (!step) {
        this.logger.warn("Step not found", {
          stepId,
          userId: userProfile.id,
        });
        return;
      }

      // Retrieve messages referenced in step.content
      const messageDTOs: any[] = [];
      for (const messageId of step.content) {
        const message = botDataService.getMessageById(messageId);
        if (message) {
          messageDTOs.push(message);
        } else {
          this.logger.warn("Message not found, skipping", {
            messageId,
            stepId,
            userId: userProfile.id,
          });
        }
      }

      if (messageDTOs.length === 0) {
        this.logger.warn("No messages found for step", {
          stepId,
          userId: userProfile.id,
        });
        return;
      }

      // Retrieve keyboard if step has one
      let keyboard: any = undefined;
      if (step.keyboard) {
        const keyboardDTO = botDataService.getKeyboardById(step.keyboard);
        if (keyboardDTO) {
          try {
            keyboard = this.keyboardConverter.convertToViberKeyboard(
              keyboardDTO,
              buttonPrefix
            );
          } catch (error) {
            this.logger.warn(
              "Failed to convert keyboard, sending messages without keyboard",
              {
                keyboardId: step.keyboard,
                stepId,
                userId: userProfile.id,
                error: error instanceof Error ? error.message : String(error),
              }
            );
          }
        } else {
          this.logger.warn(
            "Keyboard not found, sending messages without keyboard",
            {
              keyboardId: step.keyboard,
              stepId,
              userId: userProfile.id,
            }
          );
        }
      }

      // Convert messages to Viber format
      const viberMessages = this.messageConverter.convertToViberMessages(
        messageDTOs,
        keyboard
      );

      if (viberMessages.length === 0) {
        this.logger.warn("No valid messages to send after conversion", {
          stepId,
          userId: userProfile.id,
        });
        return;
      }

      // Send messages via bot
      try {
        await bot.sendMessage(userProfile, viberMessages);
        this.logger.info("Step messages sent successfully", {
          stepId,
          userId: userProfile.id,
          messageCount: viberMessages.length,
          hasKeyboard: keyboard !== undefined,
        });

        // Update user's current step in database after successful send
        try {
          await this.userRepository.updateCurrentStep(userProfile.id, stepId);
          this.logger.debug("User current step updated in database", {
            stepId,
            userId: userProfile.id,
          });
        } catch (error) {
          // Log error but don't throw - step was sent successfully
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.error("Failed to update user current step in database", {
            stepId,
            userId: userProfile.id,
            error: errorMessage,
          });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error("Failed to send step messages via bot", {
          stepId,
          userId: userProfile.id,
          error: errorMessage,
        });
        // Don't throw - error is logged, caller can handle if needed
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error("Failed to send step", {
        stepId,
        userId: userProfile.id,
        error: errorMessage,
      });
      // Don't throw - error is logged, caller can handle if needed
    }
  }
}
