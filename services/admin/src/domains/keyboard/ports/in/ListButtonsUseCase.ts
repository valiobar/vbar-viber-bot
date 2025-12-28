/**
 * List Buttons Use Case Interface
 *
 * Input port interface for listing Buttons from a Keyboard with filters and pagination.
 * This follows Hexagonal Architecture principles.
 *
 * Buttons are always embedded within Keyboards, so this use case
 * lists buttons from a specific keyboard's buttons array.
 */

import { ButtonDTO } from "../../application/dto/ButtonDTO";
import { PaginationParams } from "@shared";
import { ActionType } from "../../types";

/**
 * Input data for listing buttons
 */
export interface ListButtonsInput {
  /**
   * ID of the keyboard to list buttons from
   * Required
   */
  keyboardId: string;

  /**
   * Optional filters for filtering buttons
   */
  filters?: ListButtonsFilters;

  /**
   * Optional pagination parameters
   */
  pagination?: PaginationParams;
}

/**
 * Filters for listing buttons
 */
export interface ListButtonsFilters {
  /**
   * Filter by action type
   * If provided, only returns buttons with the specified action type
   */
  actionType?: ActionType;

  /**
   * Search term for filtering by button text
   * Performs case-insensitive partial match
   */
  search?: string;
}

/**
 * Result of listing buttons
 */
export interface ListButtonsResult {
  /**
   * Array of ButtonDTOs
   */
  buttons: ButtonDTO[];

  /**
   * Total number of buttons matching the filters (before pagination)
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
 * List Buttons Use Case Interface
 *
 * Defines the contract for listing Buttons from a Keyboard with filters and pagination.
 * Use case implementations will implement this interface.
 */
export interface ListButtonsUseCase {
  /**
   * Execute the list buttons use case
   *
   * @param input - Input data for listing buttons (includes keyboardId, optional filters and pagination)
   * @returns Promise resolving to ListButtonsResult with buttons and pagination metadata
   * @throws Error if keyboard not found or listing fails
   */
  execute(input: ListButtonsInput): Promise<ListButtonsResult>;
}
