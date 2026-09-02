/**
 * Step DTO (Data Transfer Object)
 *
 * DTO representing a Step for API requests and responses.
 * This is a plain data structure used to transfer step data
 * between the application layer and external interfaces (API routes).
 */

import { Step } from "./Step";
import type { StepDTO as SharedStepDTO } from "@vbar/shared";

/**
 * Step DTO (Data Transfer Object)
 *
 * Plain data structure matching Step entity properties
 * but without business logic or methods.
 * Provides static methods for converting between Step entities and DTOs.
 * Implements the shared StepDTO interface for cross-service compatibility.
 */
export class StepDTO implements SharedStepDTO {
  public readonly id: string;
  public readonly humanReadableName: string;
  public readonly trigger: string[];
  public readonly content: string[]; // Array of Message IDs
  public readonly keyboard: string | null; // Optional Keyboard ID
  public readonly hidden: boolean;
  public readonly isAi: boolean;
  public readonly createdAt: string;
  public readonly updatedAt: string;

  private constructor(data: {
    id: string;
    humanReadableName: string;
    trigger: string[];
    content: string[];
    keyboard: string | null;
    hidden: boolean;
    isAi: boolean;
    createdAt: string;
    updatedAt: string;
  }) {
    this.id = data.id;
    this.humanReadableName = data.humanReadableName;
    this.trigger = data.trigger;
    this.content = data.content;
    this.keyboard = data.keyboard;
    this.hidden = data.hidden;
    this.isAi = data.isAi;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  /**
   * Converts a Step entity to StepDTO
   *
   * @param step - Step domain entity
   * @returns StepDTO
   */
  public static fromEntity(step: Step): StepDTO {
    return new StepDTO({
      id: step.id,
      humanReadableName: step.humanReadableName,
      trigger: step.trigger,
      content: step.content,
      keyboard: step.keyboard,
      hidden: step.hidden,
      isAi: step.isAi,
      createdAt: step.createdAt,
      updatedAt: step.updatedAt,
    });
  }

  /**
   * Converts a StepDTO to Step entity
   *
   * Used when updating existing steps from API requests.
   * Note: This creates a new entity instance, which will trigger validation.
   *
   * @param dto - StepDTO
   * @returns Step domain entity
   */
  public static toEntity(dto: StepDTO): Step {
    return new Step({
      id: dto.id,
      humanReadableName: dto.humanReadableName,
      trigger: dto.trigger,
      content: dto.content,
      keyboard: dto.keyboard,
      hidden: dto.hidden,
      isAi: dto.isAi,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
    });
  }
}
