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
  CarouselDTO,
} from "../../application/types/DTOs";
import type { BroadcastDTO, BroadcastProgressUpdate } from "@vbar/shared";

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

  /**
   * Fetch all non-hidden carousels from admin service
   *
   * @returns Array of CarouselDTO objects
   * @throws Error if request fails or carousels cannot be retrieved
   */
  getCarousels(): Promise<CarouselDTO[]>;

  /**
   * Atomically claim one due broadcast for this instance
   *
   * @param instanceId - Unique id of this viber instance (lock owner)
   * @returns The claimed broadcast, or null if nothing is due
   * @throws Error if the claim request fails
   */
  claimBroadcast(instanceId: string): Promise<BroadcastDTO | null>;

  /**
   * Report heartbeat / counters / terminal status for a claimed broadcast
   *
   * @param broadcastId - Broadcast id
   * @param update - Progress payload (must include instanceId for the lock guard)
   * @throws Error if the report fails (including invalid lock)
   */
  reportBroadcastProgress(
    broadcastId: string,
    update: BroadcastProgressUpdate
  ): Promise<void>;
}
