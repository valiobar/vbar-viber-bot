/**
 * Step Repository Interface (Output Port)
 *
 * Defines the contract for step data persistence operations.
 * This is an output port in the Hexagonal Architecture pattern.
 */

import { Step } from "../../entities/Step";
import { PaginationParams } from "@shared/types/common";

/**
 * Filter options for querying steps
 */
export interface StepFilters {
  hidden?: boolean;
  search?: string;
  trigger?: string;
  isAi?: boolean;
  botId?: string;
}

/**
 * Result of findAll operation with pagination
 */
export interface FindAllResult {
  steps: Step[];
  total: number;
}

/**
 * Step Repository Interface
 *
 * Defines methods for persisting and retrieving Step entities.
 * Implementations of this interface will be in the adapters layer.
 */
export interface StepRepository {
  /**
   * Creates a new step in the database
   *
   * @param step - Step entity to create
   * @returns Created step with generated ID
   */
  create(step: Step): Promise<Step>;

  /**
   * Updates an existing step
   *
   * @param id - Step ID
   * @param step - Updated step entity
   * @returns Updated step entity
   * @throws Error if step not found
   */
  update(id: string, step: Step): Promise<Step>;

  /**
   * Deletes a step by ID
   *
   * @param id - Step ID to delete
   * @throws Error if step not found
   */
  delete(id: string): Promise<void>;

  /**
   * Finds a step by ID
   *
   * @param id - Step ID
   * @returns Step entity or null if not found
   */
  findById(id: string): Promise<Step | null>;

  /**
   * Finds all steps with optional filtering and pagination
   *
   * @param filters - Optional filter options (hidden, search, trigger)
   * @param pagination - Optional pagination parameters
   * @returns Object containing steps array and total count
   */
  findAll(
    filters?: StepFilters,
    pagination?: PaginationParams
  ): Promise<FindAllResult>;

  /**
   * Checks if a step exists by ID
   *
   * @param id - Step ID to check
   * @returns True if step exists, false otherwise
   */
  exists(id: string): Promise<boolean>;

  /**
   * Finds steps by trigger string
   * Used by bot service to find steps that match a specific trigger
   *
   * @param trigger - Trigger string to search for
   * @returns Array of steps that contain the trigger string in their trigger array
   */
  findByTrigger(trigger: string): Promise<Step[]>;
}
