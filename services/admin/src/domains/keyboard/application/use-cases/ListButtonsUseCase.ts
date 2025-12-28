/**
 * List Buttons Use Case Implementation
 *
 * Implements the ListButtonsUseCase interface.
 * This use case retrieves a paginated list of Button entities from a Keyboard with optional filtering.
 *
 * Buttons are always embedded within Keyboards, so this use case
 * lists buttons from a specific keyboard's buttons array.
 */

import {
  ListButtonsInput,
  ListButtonsResult,
  ListButtonsUseCase,
} from "../../ports/in/ListButtonsUseCase";
import { ButtonDTO } from "../dto/ButtonDTO";
import { KeyboardRepository } from "../../ports/out/KeyboardRepository";

/**
 * List Buttons Use Case Implementation
 *
 * Handles the retrieval of paginated Button entities from a Keyboard with filtering.
 */
export class ListButtonsUseCaseImpl implements ListButtonsUseCase {
  constructor(private readonly keyboardRepository: KeyboardRepository) {}

  /**
   * Execute the list buttons use case
   *
   * @param input - Input data for listing buttons (includes keyboardId, optional filters and pagination)
   * @returns Promise resolving to ListButtonsResult with buttons and pagination metadata
   * @throws Error if keyboard not found or listing fails
   */
  async execute(input: ListButtonsInput): Promise<ListButtonsResult> {
    // Get the keyboard
    const keyboard = await this.keyboardRepository.findById(input.keyboardId);

    if (!keyboard) {
      throw new Error(`Keyboard with ID ${input.keyboardId} not found`);
    }

    // Get all buttons from keyboard
    let buttons = keyboard.Buttons;

    // Apply filters if provided
    if (input.filters) {
      if (input.filters.actionType) {
        buttons = buttons.filter(
          (button) => button.ActionType === input.filters!.actionType
        );
      }

      if (input.filters.search) {
        const searchLower = input.filters.search.toLowerCase();
        buttons = buttons.filter(
          (button) =>
            button.Text.toLowerCase().includes(searchLower) ||
            button.ActionBody.toLowerCase().includes(searchLower)
        );
      }
    }

    // Get total count before pagination
    const total = buttons.length;

    // Apply pagination if provided
    const page = input.pagination?.page || 1;
    const limit = input.pagination?.limit || 10;
    const skip = (page - 1) * limit;

    const paginatedButtons = buttons.slice(skip, skip + limit);

    // Convert entities to DTOs
    const buttonDTOs = paginatedButtons.map((button) =>
      ButtonDTO.fromEntity(button)
    );

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);

    // Return paginated ButtonDTO array with metadata
    return {
      buttons: buttonDTOs,
      total,
      page,
      limit,
      totalPages,
    };
  }
}
