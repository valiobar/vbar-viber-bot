/**
 * List Messages Use Case Implementation
 *
 * Implements the ListMessagesUseCase interface.
 * This use case retrieves a paginated list of Message entities with optional filtering.
 */

import {
  ListMessagesFilters,
  ListMessagesResult,
  ListMessagesUseCase,
} from "../../ports/in/ListMessagesUseCase";
import { MessageDTO } from "../dto/MessageDTO";
import {
  MessageRepository,
  MessageFilters,
} from "../../ports/out/MessageRepository";
import { PaginationParams } from "@shared";

/**
 * List Messages Use Case Implementation
 *
 * Handles the retrieval of paginated Message entities with filtering.
 */
export class ListMessagesUseCaseImpl implements ListMessagesUseCase {
  constructor(private readonly messageRepository: MessageRepository) {}

  /**
   * Execute the list messages use case
   *
   * @param filters - Optional filters for filtering messages
   * @param pagination - Optional pagination parameters
   * @returns Promise resolving to ListMessagesResult with messages and pagination metadata
   * @throws Error if listing fails
   */
  async execute(
    filters?: ListMessagesFilters,
    pagination?: PaginationParams
  ): Promise<ListMessagesResult> {
    // Convert ListMessagesFilters to MessageFilters
    const repositoryFilters: MessageFilters = {
      hidden: filters?.hidden,
      type: filters?.type,
      search: filters?.search,
    };

    // Get paginated results from repository
    const result = await this.messageRepository.findAll(
      repositoryFilters,
      pagination
    );

    // Convert entities to DTOs
    const messageDTOs = result.messages.map((message) =>
      MessageDTO.fromEntity(message)
    );

    // Calculate pagination metadata
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const totalPages = Math.ceil(result.total / limit);

    // Return paginated MessageDTO array with metadata
    return {
      messages: messageDTOs,
      total: result.total,
      page,
      limit,
      totalPages,
    };
  }
}

