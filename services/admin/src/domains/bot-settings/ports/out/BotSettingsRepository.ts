/**
 * BotSettings Repository Interface (Output Port)
 *
 * Defines the contract for bot settings data persistence operations.
 * This is an output port in the Hexagonal Architecture pattern.
 * Bot Settings follow a singleton pattern (only one settings document exists).
 */

import { BotSettings } from "../../entities/BotSettings";

/**
 * BotSettings Repository Interface
 *
 * Defines methods for persisting and retrieving BotSettings entities.
 * Implementations of this interface will be in the adapters layer.
 * Bot Settings use a singleton pattern - only one settings document exists.
 */
export interface BotSettingsRepository {
  /**
   * Finds the bot settings (singleton pattern)
   *
   * @returns BotSettings entity or null if no settings exist
   */
  findOne(): Promise<BotSettings | null>;

  /**
   * Saves bot settings (creates new or updates existing)
   *
   * @param settings - BotSettings entity to save
   * @returns Saved BotSettings entity with generated/updated ID
   */
  save(settings: BotSettings): Promise<BotSettings>;

  /**
   * Updates bot settings with partial updates
   *
   * @param id - BotSettings ID
   * @param updates - Partial updates to apply
   * @returns Updated BotSettings entity
   * @throws Error if settings not found
   */
  update(id: string, updates: Partial<BotSettings>): Promise<BotSettings>;
}
