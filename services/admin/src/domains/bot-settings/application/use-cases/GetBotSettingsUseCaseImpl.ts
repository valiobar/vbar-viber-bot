/**
 * Get Bot Settings Use Case Implementation
 *
 * Implements the GetBotSettingsUseCase interface.
 * This use case retrieves the Bot Settings entity from the repository.
 * Bot Settings follow a singleton pattern (only one settings document exists).
 */

import { GetBotSettingsUseCase } from "../../ports/in/GetBotSettingsUseCase";
import { BotSettingsDTO } from "../dto/BotSettingsDTO";
import { BotSettingsRepository } from "../../ports/out/BotSettingsRepository";

/**
 * Get Bot Settings Use Case Implementation
 *
 * Handles the retrieval of Bot Settings entity.
 */
export class GetBotSettingsUseCaseImpl implements GetBotSettingsUseCase {
  constructor(private readonly botSettingsRepository: BotSettingsRepository) {}

  /**
   * Execute the get bot settings use case
   *
   * @returns Promise resolving to the BotSettingsDTO
   * @throws Error if bot settings not found
   */
  async execute(): Promise<BotSettingsDTO> {
    // Get bot settings from repository (singleton pattern)
    const settings = await this.botSettingsRepository.findOne();

    if (!settings) {
      throw new Error("Bot settings not found");
    }

    // Convert to DTO
    return BotSettingsDTO.fromEntity(settings);
  }
}


