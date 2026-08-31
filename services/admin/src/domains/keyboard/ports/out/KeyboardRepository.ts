/**
 * Keyboard Repository Interface (Output Port)
 *
 * Defines the contract for keyboard data persistence operations.
 * This is an output port in the Hexagonal Architecture pattern.
 */

import { Keyboard } from "../../entities/Keyboard";
import { PaginationParams } from "@shared";

/**
 * Filter options for querying keyboards
 */
export interface KeyboardFilters {
  hidden?: boolean;
  isBroadcast?: boolean;
  search?: string;
  botId?: string;
}

/**
 * Result of findAll operation with pagination
 */
export interface FindAllResult {
  keyboards: Keyboard[];
  total: number;
}

/**
 * Keyboard Repository Interface
 *
 * Defines methods for persisting and retrieving Keyboard entities.
 * Implementations of this interface will be in the adapters layer.
 */
export interface KeyboardRepository {
  /**
   * Creates a new keyboard in the database
   *
   * @param keyboard - Keyboard entity to create
   * @returns Created keyboard with generated ID
   */
  create(keyboard: Keyboard): Promise<Keyboard>;

  /**
   * Updates an existing keyboard
   *
   * @param id - Keyboard ID
   * @param keyboard - Updated keyboard entity
   * @returns Updated keyboard entity
   * @throws Error if keyboard not found
   */
  update(id: string, keyboard: Keyboard): Promise<Keyboard>;

  /**
   * Deletes a keyboard by ID
   *
   * @param id - Keyboard ID to delete
   * @throws Error if keyboard not found
   */
  delete(id: string): Promise<void>;

  /**
   * Finds a keyboard by ID
   *
   * @param id - Keyboard ID
   * @returns Keyboard entity or null if not found
   */
  findById(id: string): Promise<Keyboard | null>;

  /**
   * Finds all keyboards with optional filtering and pagination
   *
   * @param filters - Optional filter options (hidden, isBroadcast, search)
   * @param pagination - Optional pagination parameters
   * @returns Object containing keyboards array and total count
   */
  findAll(
    filters?: KeyboardFilters,
    pagination?: PaginationParams
  ): Promise<FindAllResult>;

  /**
   * Checks if a keyboard exists by ID
   *
   * @param id - Keyboard ID to check
   * @returns True if keyboard exists, false otherwise
   */
  exists(id: string): Promise<boolean>;
}
