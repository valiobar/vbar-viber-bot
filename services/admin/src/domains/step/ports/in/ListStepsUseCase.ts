/**
 * List Steps Use Case Interface
 *
 * Input port interface for listing Steps with filters and pagination.
 * This follows Hexagonal Architecture principles.
 */

import { StepDTO } from "../../application/dto/StepDTO";
import { PaginationParams } from "@vbar/shared";

/**
 * Filters for listing steps
 */
export interface ListStepsFilters {
  /**
   * Filter by hidden status
   * If true, only returns hidden steps
   * If false, only returns non-hidden steps
   * If undefined, returns all steps
   */
  hidden?: boolean;

  /**
   * Search term for filtering by humanReadableName
   * Performs case-insensitive partial match
   */
  search?: string;

  /**
   * Filter by trigger string
   * If specified, only returns steps that have this trigger
   * If undefined, returns steps with any trigger
   */
  trigger?: string;
}

/**
 * Result of listing steps
 */
export interface ListStepsResult {
  /**
   * Array of StepDTOs
   */
  steps: StepDTO[];

  /**
   * Total number of steps matching the filters (before pagination)
   */
  total: number;

  /**
   * Current page number
   */
  page: number;

  /**
   * Number of items per page
   */
  limit: number;

  /**
   * Total number of pages
   */
  totalPages: number;
}

/**
 * List Steps Use Case Interface
 *
 * Defines the contract for listing Steps with filters and pagination.
 * Use case implementations will implement this interface.
 */
export interface ListStepsUseCase {
  /**
   * Execute the list steps use case
   *
   * @param filters - Optional filters for filtering steps
   * @param pagination - Optional pagination parameters
   * @returns Promise resolving to ListStepsResult with steps and pagination metadata
   * @throws Error if listing fails
   */
  execute(
    filters?: ListStepsFilters,
    pagination?: PaginationParams
  ): Promise<ListStepsResult>;
}

