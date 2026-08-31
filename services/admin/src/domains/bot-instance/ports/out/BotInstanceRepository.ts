/**
 * BotInstance Repository Interface (Output Port)
 *
 * Defines the contract for bot instance data persistence operations.
 * This is an output port in the Hexagonal Architecture pattern.
 */

import { BotInstance } from "../../entities/BotInstance";
import { BotPlatform, BotStatus } from "../../types";
import { PaginationParams } from "@vbar/shared";

/**
 * Filter options for querying bot instances
 */
export interface BotInstanceFilters {
  platform?: BotPlatform;
  status?: BotStatus;
  search?: string; // Search by name or botId
}

/**
 * Result of findAll operation with pagination
 */
export interface FindAllResult {
  botInstances: BotInstance[];
  total: number;
}

/**
 * BotInstance Repository Interface
 *
 * Defines methods for persisting and retrieving BotInstance entities.
 * Implementations of this interface will be in the adapters layer.
 */
export interface BotInstanceRepository {
  /**
   * Creates a new bot instance in the database
   *
   * @param botInstance - BotInstance entity to create
   * @returns Created bot instance with generated ID
   */
  create(botInstance: BotInstance): Promise<BotInstance>;

  /**
   * Finds a bot instance by ID
   *
   * @param id - BotInstance ID
   * @returns BotInstance entity or null if not found
   */
  findById(id: string): Promise<BotInstance | null>;

  /**
   * Finds a bot instance by botId (unique identifier)
   *
   * @param botId - Bot ID (unique identifier)
   * @returns BotInstance entity or null if not found
   */
  findByBotId(botId: string): Promise<BotInstance | null>;

  /**
   * Finds all bot instances with optional filtering and pagination
   *
   * @param filters - Optional filter options (platform, status, search)
   * @param pagination - Optional pagination parameters
   * @returns Object containing botInstances array and total count
   */
  findAll(
    filters?: BotInstanceFilters,
    pagination?: PaginationParams
  ): Promise<FindAllResult>;

  /**
   * Updates an existing bot instance
   *
   * @param id - BotInstance ID
   * @param updates - Partial updates to apply
   * @returns Updated bot instance entity
   * @throws Error if bot instance not found
   */
  update(id: string, updates: Partial<BotInstance>): Promise<BotInstance>;

  /**
   * Deletes a bot instance by ID
   *
   * @param id - BotInstance ID to delete
   * @throws Error if bot instance not found
   */
  delete(id: string): Promise<void>;

  /**
   * Checks if a bot instance exists by ID
   *
   * @param id - BotInstance ID to check
   * @returns True if bot instance exists, false otherwise
   */
  exists(id: string): Promise<boolean>;
}

