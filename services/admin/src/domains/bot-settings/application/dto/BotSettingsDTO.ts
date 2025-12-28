/**
 * Bot Settings DTO (Data Transfer Object)
 *
 * DTO representing Bot Settings for API requests and responses.
 * This is a plain data structure used to transfer bot settings data
 * between the application layer and external interfaces (API routes).
 */

import { BotSettings } from "../../entities/BotSettings";
import { BotStatus } from "../../types";

/**
 * Bot Settings DTO (Data Transfer Object)
 *
 * Plain data structure matching BotSettings entity properties
 * but without business logic or methods.
 * Provides static methods for converting between BotSettings entities and DTOs.
 */
export class BotSettingsDTO {
  public readonly id: string;
  public readonly avatarURL: string | null;
  public readonly botName: string;
  public readonly botViberName: string | null;
  public readonly status: BotStatus;
  public readonly buttonsBackground: string | null;
  public readonly buttonsTextColor: string | null;
  public readonly buttonsPrefix: string | null;
  public readonly welcomeStepId: string | null;
  public readonly GAKey: string | null;
  public readonly createdAt: string;
  public readonly updatedAt: string;

  private constructor(data: {
    id: string;
    avatarURL: string | null;
    botName: string;
    botViberName: string | null;
    status: BotStatus;
    buttonsBackground: string | null;
    buttonsTextColor: string | null;
    buttonsPrefix: string | null;
    welcomeStepId: string | null;
    GAKey: string | null;
    createdAt: string;
    updatedAt: string;
  }) {
    this.id = data.id;
    this.avatarURL = data.avatarURL;
    this.botName = data.botName;
    this.botViberName = data.botViberName;
    this.status = data.status;
    this.buttonsBackground = data.buttonsBackground;
    this.buttonsTextColor = data.buttonsTextColor;
    this.buttonsPrefix = data.buttonsPrefix;
    this.welcomeStepId = data.welcomeStepId;
    this.GAKey = data.GAKey;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  /**
   * Converts a BotSettings entity to BotSettingsDTO
   *
   * @param settings - BotSettings domain entity
   * @returns BotSettingsDTO
   */
  public static fromEntity(settings: BotSettings): BotSettingsDTO {
    return new BotSettingsDTO({
      id: settings.id,
      avatarURL: settings.avatarURL,
      botName: settings.botName,
      botViberName: settings.botViberName,
      status: settings.status,
      buttonsBackground: settings.buttonsBackground,
      buttonsTextColor: settings.buttonsTextColor,
      buttonsPrefix: settings.buttonsPrefix,
      welcomeStepId: settings.welcomeStepId,
      GAKey: settings.GAKey,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    });
  }

  /**
   * Converts a BotSettingsDTO to BotSettings entity
   *
   * Used when updating existing bot settings from API requests.
   * Note: This creates a new entity instance, which will trigger validation.
   *
   * @param dto - BotSettingsDTO
   * @returns BotSettings domain entity
   */
  public static toEntity(dto: BotSettingsDTO): BotSettings {
    return new BotSettings({
      id: dto.id,
      avatarURL: dto.avatarURL,
      botName: dto.botName,
      botViberName: dto.botViberName,
      status: dto.status,
      buttonsBackground: dto.buttonsBackground,
      buttonsTextColor: dto.buttonsTextColor,
      buttonsPrefix: dto.buttonsPrefix,
      welcomeStepId: dto.welcomeStepId,
      GAKey: dto.GAKey,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
    });
  }
}
