/**
 * Bot Settings type for Viber service
 *
 * Matches the BotSettingsDTO structure from admin service.
 * This type represents bot configuration fetched from admin service.
 */

/**
 * Bot status type
 */
export type BotStatus = "active" | "inactive" | "maintenance";

/**
 * Bot Settings interface
 *
 * Represents bot configuration fetched from admin service.
 * Matches the BotSettingsDTO structure from admin service API.
 */
export interface BotSettings {
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
}




