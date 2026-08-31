/**
 * Output port interface for Admin Service Client
 *
 * Defines the contract for communicating with the Admin Service API.
 * This is a port in the Hexagonal Architecture pattern.
 */

import { BotSettings } from "../../application/types/BotSettings";
import type {
  StepDTO,
  MessageDTO,
  KeyboardDTO,
} from "../../application/types/DTOs";

/**
 * Output port interface for Admin Service Client
 *
 * Defines the contract for communicating with the Admin Service API.
 * This is a port in the Hexagonal Architecture pattern.
 */
export interface IAdminServiceClient {
  /**
   * Fetch bot settings from admin service
   *
   * @returns Bot settings including name, avatar, and configuration
   * @throws Error if request fails or settings cannot be retrieved
   */
  getBotSettings(): Promise<BotSettings>;

  /**
   * Fetch all non-hidden steps from admin service
   *
   * @returns Array of StepDTO objects
   * @throws Error if request fails or steps cannot be retrieved
   */
  getSteps(): Promise<StepDTO[]>;

  /**
   * Fetch all non-hidden messages from admin service
   *
   * @returns Array of MessageDTO objects
   * @throws Error if request fails or messages cannot be retrieved
   */
  getMessages(): Promise<MessageDTO[]>;

  /**
   * Fetch all non-hidden keyboards from admin service
   *
   * @returns Array of KeyboardDTO objects
   * @throws Error if request fails or keyboards cannot be retrieved
   */
  getKeyboards(): Promise<KeyboardDTO[]>;
}
