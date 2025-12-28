/**
 * Update Bot Settings Use Case Implementation
 *
 * Implements the UpdateBotSettingsUseCase interface.
 * This use case updates Bot Settings, validates referenced Step ID,
 * and saves it to the repository.
 * Bot Settings follow a singleton pattern (only one settings document exists).
 */

import {
  UpdateBotSettingsInput,
  UpdateBotSettingsUseCase,
} from "../../ports/in/UpdateBotSettingsUseCase";
import { BotSettingsDTO } from "../dto/BotSettingsDTO";
import { BotSettings } from "../../entities/BotSettings";
import { BotSettingsRepository } from "../../ports/out/BotSettingsRepository";
import { StepRepository } from "../../../step/ports/out/StepRepository";

/**
 * Generates a random buttons prefix
 *
 * Creates a 14-character string:
 * - 13 characters: random letters (a-z, A-Z) and numbers (0-9)
 * - 1 character: "-" (hyphen) at the end
 *
 * @returns Random buttons prefix string (e.g., "aB3xK9mN2pQ7r-")
 */
function generateButtonsPrefix(): string {
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

/**
 * Update Bot Settings Use Case Implementation
 *
 * Handles the update of Bot Settings with validation of referenced Step.
 */
export class UpdateBotSettingsUseCaseImpl implements UpdateBotSettingsUseCase {
  constructor(
    private readonly botSettingsRepository: BotSettingsRepository,
    private readonly stepRepository: StepRepository
  ) {}

  /**
   * Execute the update bot settings use case
   *
   * @param input - Input data for updating the bot settings
   * @returns Promise resolving to the updated BotSettingsDTO
   * @throws Error if bot settings not found, update fails, validation fails, or referenced Step not found
   */
  async execute(input: UpdateBotSettingsInput): Promise<BotSettingsDTO> {
    // Get existing settings from repository (singleton pattern)
    let existingSettings = await this.botSettingsRepository.findOne();

    // If no settings exist, create new BotSettings entity with defaults
    if (!existingSettings) {
      // Generate default buttonsPrefix if not provided or is empty/null
      const buttonsPrefix =
        input.buttonsPrefix && input.buttonsPrefix.trim() !== ""
          ? input.buttonsPrefix
          : generateButtonsPrefix();

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
            : existingSettings.buttonsPrefix || generateButtonsPrefix()
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
}
