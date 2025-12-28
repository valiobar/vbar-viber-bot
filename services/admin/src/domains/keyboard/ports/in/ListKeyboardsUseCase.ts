/**
 * List Keyboards Use Case Interface
 *
 * Input port interface for listing Keyboards with filters and pagination.
 * This follows Hexagonal Architecture principles.
 */

import { KeyboardDTO } from "../../application/dto/KeyboardDTO";
import { PaginationParams } from "@vbar/shared";

/**
 * Filters for listing keyboards
 */
export interface ListKeyboardsFilters {
  /**
   * Filter by hidden status
   * If true, only returns hidden keyboards
   * If false, only returns non-hidden keyboards
   * If undefined, returns all keyboards
   */
  hidden?: boolean;

  /**
   * Filter by broadcast status
   * If true, only returns broadcast keyboards
   * If false, only returns non-broadcast keyboards
   * If undefined, returns all keyboards
   */
  isBroadcast?: boolean;

  /**
   * Search term for filtering by humanReadableName or title
   * Performs case-insensitive partial match
   */
  search?: string;
}

/**
 * Result of listing keyboards
 */
export interface ListKeyboardsResult {
  /**
   * Array of KeyboardDTOs
   */
  keyboards: KeyboardDTO[];

  /**
   * Total number of keyboards matching the filters (before pagination)
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
 * List Keyboards Use Case Interface
 *
 * Defines the contract for listing Keyboards with filters and pagination.
 * Use case implementations will implement this interface.
 */
export interface ListKeyboardsUseCase {
  /**
   * Execute the list keyboards use case
   *
   * @param filters - Optional filters for filtering keyboards
   * @param pagination - Optional pagination parameters
   * @returns Promise resolving to ListKeyboardsResult with keyboards and pagination metadata
   * @throws Error if listing fails
   */
  execute(
    filters?: ListKeyboardsFilters,
    pagination?: PaginationParams
  ): Promise<ListKeyboardsResult>;
}

