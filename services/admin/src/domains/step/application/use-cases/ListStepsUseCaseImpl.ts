/**
 * List Steps Use Case Implementation
 *
 * Implements the ListStepsUseCase interface.
 * This use case retrieves a paginated list of Step entities with optional filtering.
 */

import {
  ListStepsFilters,
  ListStepsResult,
  ListStepsUseCase,
} from "../../ports/in/ListStepsUseCase";
import { StepDTO } from "../dto/StepDTO";
import { StepRepository, StepFilters } from "../../ports/out/StepRepository";
import { PaginationParams } from "@vbar/shared";

/**
 * List Steps Use Case Implementation
 *
 * Handles the retrieval of paginated Step entities with filtering.
 */
export class ListStepsUseCaseImpl implements ListStepsUseCase {
  constructor(private readonly stepRepository: StepRepository) {}

  /**
   * Execute the list steps use case
   *
   * @param filters - Optional filters for filtering steps
   * @param pagination - Optional pagination parameters
   * @returns Promise resolving to ListStepsResult with steps and pagination metadata
   * @throws Error if listing fails
   */
  async execute(
    filters?: ListStepsFilters,
    pagination?: PaginationParams
  ): Promise<ListStepsResult> {
    // Convert ListStepsFilters to StepFilters
    const repositoryFilters: StepFilters = {
      hidden: filters?.hidden,
      isAi: filters?.isAi,
      search: filters?.search,
      trigger: filters?.trigger,
    };

    // Get paginated results from repository
    const result = await this.stepRepository.findAll(
      repositoryFilters,
      pagination
    );

    // Convert entities to DTOs
    const stepDTOs = result.steps.map((step) => StepDTO.fromEntity(step));

    // Calculate pagination metadata
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const totalPages = Math.ceil(result.total / limit);

    // Return paginated StepDTO array with metadata
    return {
      steps: stepDTOs,
      total: result.total,
      page,
      limit,
      totalPages,
    };
  }
}
