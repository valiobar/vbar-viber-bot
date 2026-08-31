/**
 * Message Repository Interface (Output Port)
 *
 * Defines the contract for message data persistence operations.
 * This is an output port in the Hexagonal Architecture pattern.
 */

import { Message } from "../../entities/Message";
import { MessageType } from "../../types";
import { PaginationParams } from "@shared";

/**
 * Filter options for querying messages
 */
export interface MessageFilters {
  hidden?: boolean;
  type?: MessageType;
  search?: string;
  botId?: string;
}

/**
 * Result of findAll operation with pagination
 */
export interface FindAllResult {
  messages: Message[];
  total: number;
}

/**
 * Message Repository Interface
 *
 * Defines methods for persisting and retrieving Message entities.
 * Implementations of this interface will be in the adapters layer.
 */
export interface MessageRepository {
  /**
   * Creates a new message in the database
   *
   * @param message - Message entity to create
   * @returns Created message with generated ID
   */
  create(message: Message): Promise<Message>;

  /**
   * Updates an existing message
   *
   * @param id - Message ID
   * @param message - Updated message entity
   * @returns Updated message entity
   * @throws Error if message not found
   */
  update(id: string, message: Message): Promise<Message>;

  /**
   * Deletes a message by ID
   *
   * @param id - Message ID to delete
   * @throws Error if message not found
   */
  delete(id: string): Promise<void>;

  /**
   * Finds a message by ID
   *
   * @param id - Message ID
   * @returns Message entity or null if not found
   */
  findById(id: string): Promise<Message | null>;

  /**
   * Finds all messages with optional filtering and pagination
   *
   * @param filters - Optional filter options (hidden, type, search)
   * @param pagination - Optional pagination parameters
   * @returns Object containing messages array and total count
   */
  findAll(
    filters?: MessageFilters,
    pagination?: PaginationParams
  ): Promise<FindAllResult>;

  /**
   * Checks if a message exists by ID
   *
   * @param id - Message ID to check
   * @returns True if message exists, false otherwise
   */
  exists(id: string): Promise<boolean>;
}





