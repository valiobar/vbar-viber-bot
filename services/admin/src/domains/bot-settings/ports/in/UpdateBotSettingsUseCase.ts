/**
 * Update Bot Settings Use Case Interface
 *
 * Input port interface for updating Bot Settings.
 * This follows Hexagonal Architecture principles.
 * Bot Settings follow a singleton pattern (only one settings document exists).
 */

import { BotSettingsDTO } from "../../application/dto/BotSettingsDTO";
import { BotStatus } from "../../types";

/**
 * Input data for updating Bot Settings
 */
export interface UpdateBotSettingsInput {
  /**
   * Avatar URL for the bot
   * Optional - if not provided, avatarURL remains unchanged
   */
  avatarURL?: string | null;

  /**
   * Bot name
   * Optional - if not provided, botName remains unchanged
   */
  botName?: string;

  /**
   * Bot Viber name
   * Optional - if not provided, botViberName remains unchanged
   */
  botViberName?: string | null;

  /**
   * Bot status
   * Optional - if not provided, status remains unchanged
   */
  status?: BotStatus;

  /**
   * Buttons background color (hex code)
   * Optional - if not provided, buttonsBackground remains unchanged
   */
  buttonsBackground?: string | null;

  /**
   * Buttons text color (hex code)
   * Optional - if not provided, buttonsTextColor remains unchanged
   */
  buttonsTextColor?: string | null;

  /**
   * Buttons prefix
   * Optional - if not provided, buttonsPrefix remains unchanged
   */
  buttonsPrefix?: string | null;

  /**
   * Welcome step ID reference
   * Optional - if not provided, welcomeStepId remains unchanged
   */
  welcomeStepId?: string | null;

  /**
   * Google Analytics key
   * Optional - if not provided, GAKey remains unchanged
   */
  GAKey?: string | null;
}

/**
 * Update Bot Settings Use Case Interface
 *
 * Defines the contract for updating Bot Settings.
 * Use case implementations will implement this interface.
 */
export interface UpdateBotSettingsUseCase {
  /**
   * Execute the update bot settings use case
   *
   * @param input - Input data for updating the bot settings
   * @returns Promise resolving to the updated BotSettingsDTO
   * @throws Error if bot settings not found, update fails, validation fails, or referenced Step not found
   */
  execute(input: UpdateBotSettingsInput): Promise<BotSettingsDTO>;
}




