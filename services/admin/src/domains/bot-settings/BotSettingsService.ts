/**
 * Bot Settings application service
 *
 * Route → service → repository for bot settings (singleton).
 */

import { BotSettingsRepository } from "./BotSettingsRepository";
import { StepRepository } from "../step/StepRepository";
import { BotSettingsDTO } from "./BotSettingsDTO";
import { BotSettings } from "./BotSettings";
import { BotStatus } from "./types";

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

export class BotSettingsService {
  constructor(
    private readonly botSettingsRepository: BotSettingsRepository,
    private readonly stepRepository: StepRepository
  ) {}

  /**
   * Get bot settings (singleton)
   *
   * @returns Promise resolving to the BotSettingsDTO
   * @throws Error if bot settings not found
   */
  async get(): Promise<BotSettingsDTO> {
    // Get bot settings from repository (singleton pattern)
    const settings = await this.botSettingsRepository.findOne();

    if (!settings) {
      throw new Error("Bot settings not found");
    }

    // Convert to DTO
    return BotSettingsDTO.fromEntity(settings);
  }

  /**
   * Update bot settings, validating the referenced Step ID
   *
   * @param input - Input data for updating the bot settings
   * @returns Promise resolving to the updated BotSettingsDTO
   * @throws Error if bot settings not found, update fails, validation fails, or referenced Step not found
   */
  async update(input: UpdateBotSettingsInput): Promise<BotSettingsDTO> {
    // Get existing settings from repository (singleton pattern)
    let existingSettings = await this.botSettingsRepository.findOne();

    // If no settings exist, create new BotSettings entity with defaults
    if (!existingSettings) {
      // Generate default buttonsPrefix if not provided or is empty/null
      const buttonsPrefix =
        input.buttonsPrefix && input.buttonsPrefix.trim() !== ""
          ? input.buttonsPrefix
          : this.generateButtonsPrefix();

      existingSettings = BotSettings.create({
        botName: input.botName || "Bot",
        buttonsPrefix: buttonsPrefix,
      });
    }

    // Validate referenced Step ID if provided in input
    if (input.welcomeStepId !== null && input.welcomeStepId !== undefined) {
      const stepExists = await this.stepRepository.findById(
        input.welcomeStepId
      );
      if (!stepExists) {
        throw new Error(`Step with ID ${input.welcomeStepId} not found`);
      }
    }

    // Merge input with existing settings
    const updatedSettings = existingSettings.update({
      avatarURL:
        input.avatarURL !== undefined
          ? input.avatarURL
          : existingSettings.avatarURL,
      botName:
        input.botName !== undefined ? input.botName : existingSettings.botName,
      botViberName:
        input.botViberName !== undefined
          ? input.botViberName
          : existingSettings.botViberName,
      status:
        input.status !== undefined ? input.status : existingSettings.status,
      buttonsBackground:
        input.buttonsBackground !== undefined
          ? input.buttonsBackground
          : existingSettings.buttonsBackground,
      buttonsTextColor:
        input.buttonsTextColor !== undefined
          ? input.buttonsTextColor
          : existingSettings.buttonsTextColor,
      buttonsPrefix:
        input.buttonsPrefix !== undefined
          ? input.buttonsPrefix && input.buttonsPrefix.trim() !== ""
            ? input.buttonsPrefix
            : existingSettings.buttonsPrefix || this.generateButtonsPrefix()
          : existingSettings.buttonsPrefix,
      welcomeStepId:
        input.welcomeStepId !== undefined
          ? input.welcomeStepId
          : existingSettings.welcomeStepId,
      GAKey: input.GAKey !== undefined ? input.GAKey : existingSettings.GAKey,
    });

    // Save via repository
    const savedSettings = await this.botSettingsRepository.save(
      updatedSettings
    );

    // Convert to DTO and return
    return BotSettingsDTO.fromEntity(savedSettings);
  }

  /**
   * Generates a random buttons prefix
   *
   * Creates a 14-character string:
   * - 13 characters: random letters (a-z, A-Z) and numbers (0-9)
   * - 1 character: "-" (hyphen) at the end
   *
   * @returns Random buttons prefix string (e.g., "aB3xK9mN2pQ7r-")
   */
  private generateButtonsPrefix(): string {
    const chars =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";

    // Generate 13 random alphanumeric characters
    for (let i = 0; i < 13; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Add hyphen at the end
    return result + "-";
  }
}
