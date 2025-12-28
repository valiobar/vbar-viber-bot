/**
 * Get Bot Settings Use Case Interface
 *
 * Input port interface for retrieving Bot Settings.
 * This follows Hexagonal Architecture principles.
 * Bot Settings follow a singleton pattern (only one settings document exists).
 */

import { BotSettingsDTO } from "../../application/dto/BotSettingsDTO";

/**
 * Get Bot Settings Use Case Interface
 *
 * Defines the contract for retrieving Bot Settings.
 * Use case implementations will implement this interface.
 */
export interface GetBotSettingsUseCase {
  /**
   * Execute the get bot settings use case
   *
   * @returns Promise resolving to the BotSettingsDTO
   * @throws Error if bot settings not found
   */
  execute(): Promise<BotSettingsDTO>;
}
