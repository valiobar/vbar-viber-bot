/**
 * List Messages Use Case Interface
 *
 * Input port interface for listing Messages with filters and pagination.
 * This follows Hexagonal Architecture principles.
 */

import { MessageDTO } from "../../application/dto/MessageDTO";
import { MessageType } from "../../types";
import { PaginationParams } from "@vbar/shared";

/**
 * Filters for listing messages
 */
export interface ListMessagesFilters {
  /**
   * Filter by hidden status
   * If true, only returns hidden messages
   * If false, only returns non-hidden messages
   * If undefined, returns all messages
   */
  hidden?: boolean;

  /**
   * Filter by message type
   * If specified, only returns messages of that type
   * If undefined, returns messages of all types
   */
  type?: MessageType;

  /**
   * Search term for filtering by humanReadableName
   * Performs case-insensitive partial match
   */
  search?: string;
}

/**
 * Result of listing messages
 */
export interface ListMessagesResult {
  /**
   * Array of MessageDTOs
   */
  messages: MessageDTO[];

  /**
   * Total number of messages matching the filters (before pagination)
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
 * List Messages Use Case Interface
 *
 * Defines the contract for listing Messages with filters and pagination.
 * Use case implementations will implement this interface.
 */
export interface ListMessagesUseCase {
  /**
   * Execute the list messages use case
   *
   * @param filters - Optional filters for filtering messages
   * @param pagination - Optional pagination parameters
   * @returns Promise resolving to ListMessagesResult with messages and pagination metadata
   * @throws Error if listing fails
   */
  execute(
    filters?: ListMessagesFilters,
    pagination?: PaginationParams
  ): Promise<ListMessagesResult>;
}
