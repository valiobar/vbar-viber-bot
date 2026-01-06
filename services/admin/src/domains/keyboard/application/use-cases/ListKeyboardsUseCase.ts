/**
 * List Keyboards Use Case Implementation
 *
 * Implements the ListKeyboardsUseCase interface.
 * This use case retrieves a paginated list of Keyboard entities with optional filtering.
 */

import {
  ListKeyboardsFilters,
  ListKeyboardsResult,
  ListKeyboardsUseCase,
} from "../../ports/in/ListKeyboardsUseCase";
import { KeyboardDTO } from "../dto/KeyboardDTO";
import {
  KeyboardRepository,
  KeyboardFilters,
} from "../../ports/out/KeyboardRepository";
import { PaginationParams } from "@shared";

/**
 * List Keyboards Use Case Implementation
 *
 * Handles the retrieval of paginated Keyboard entities with filtering.
 */
export class ListKeyboardsUseCaseImpl implements ListKeyboardsUseCase {
  constructor(private readonly keyboardRepository: KeyboardRepository) {}

  /**
   * Execute the list keyboards use case
   *
   * @param filters - Optional filters for filtering keyboards
   * @param pagination - Optional pagination parameters
   * @returns Promise resolving to ListKeyboardsResult with keyboards and pagination metadata
   * @throws Error if listing fails
   */
  async execute(
    filters?: ListKeyboardsFilters,
    pagination?: PaginationParams
  ): Promise<ListKeyboardsResult> {
    // Convert ListKeyboardsFilters to KeyboardFilters
    const repositoryFilters: KeyboardFilters = {
      hidden: filters?.hidden,
      isBroadcast: filters?.isBroadcast,
      search: filters?.search,
    };

    // Get paginated results from repository
    const result = await this.keyboardRepository.findAll(
      repositoryFilters,
      pagination
    );

    // Convert entities to DTOs
    const keyboardDTOs = result.keyboards.map((keyboard) =>
      KeyboardDTO.fromEntity(keyboard)
    );

    // Calculate pagination metadata
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const totalPages = Math.ceil(result.total / limit);

    // Return paginated KeyboardDTO array with metadata
    return {
      keyboards: keyboardDTOs,
      total: result.total,
      page,
      limit,
      totalPages,
    };
  }
}



