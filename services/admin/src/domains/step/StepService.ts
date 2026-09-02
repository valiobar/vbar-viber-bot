/**
 * Step application service
 *
 * Route → service → repository for step CRUD.
 * Create/update validate referenced message and keyboard IDs via those
 * repositories (the one piece of real cross-domain logic).
 */

import { PaginationParams } from "@vbar/shared";
import { paginate } from "@/lib/api/paginate";
import { Step } from "./Step";
import { StepRepository, StepFilters } from "./StepRepository";
import { MessageRepository } from "../message/MessageRepository";
import { KeyboardRepository } from "../keyboard/KeyboardRepository";
import { StepDTO } from "./StepDTO";

export interface CreateStepInput {
  humanReadableName: string;
  trigger: string[];
  content: string[];
  keyboard?: string | null;
  hidden?: boolean;
  isAi?: boolean;
}

export interface UpdateStepInput {
  humanReadableName?: string;
  trigger?: string[];
  content?: string[];
  keyboard?: string | null;
  hidden?: boolean;
  isAi?: boolean;
}

export interface ListStepsFilters {
  hidden?: boolean;
  isAi?: boolean;
  search?: string;
  trigger?: string;
}

export interface ListStepsResult {
  steps: StepDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class StepService {
  constructor(
    private readonly stepRepository: StepRepository,
    private readonly messageRepository: MessageRepository,
    private readonly keyboardRepository: KeyboardRepository
  ) {}

  async list(
    filters?: ListStepsFilters,
    pagination?: PaginationParams
  ): Promise<ListStepsResult> {
    const repositoryFilters: StepFilters = {
      hidden: filters?.hidden,
      isAi: filters?.isAi,
      search: filters?.search,
      trigger: filters?.trigger,
    };

    const result = await this.stepRepository.findAll(
      repositoryFilters,
      pagination
    );

    return {
      steps: result.steps.map((step) => StepDTO.fromEntity(step)),
      total: result.total,
      ...paginate(result.total, pagination),
    };
  }

  async get(id: string): Promise<StepDTO> {
    const step = await this.stepRepository.findById(id);
    if (!step) {
      throw new Error(`Step with ID ${id} not found`);
    }
    return StepDTO.fromEntity(step);
  }

  async create(input: CreateStepInput): Promise<StepDTO> {
    await this.assertMessagesExist(input.content);
    await this.assertKeyboardExists(input.keyboard ?? null);

    const step = Step.create({
      humanReadableName: input.humanReadableName,
      trigger: input.trigger,
      content: input.content,
      keyboard: input.keyboard ?? null,
      hidden: input.hidden ?? false,
      isAi: input.isAi ?? false,
    });

    const saved = await this.stepRepository.create(step);
    return StepDTO.fromEntity(saved);
  }

  async update(id: string, input: UpdateStepInput): Promise<StepDTO> {
    const existing = await this.stepRepository.findById(id);
    if (!existing) {
      throw new Error(`Step with ID ${id} not found`);
    }

    const updatedContent = input.content ?? existing.content;
    const updatedKeyboard =
      input.keyboard !== undefined ? input.keyboard : existing.keyboard;

    if (input.content !== undefined) {
      await this.assertMessagesExist(updatedContent);
    }
    if (input.keyboard !== undefined && updatedKeyboard !== null) {
      await this.assertKeyboardExists(updatedKeyboard);
    }

    const updated = new Step({
      id: existing.id,
      humanReadableName: input.humanReadableName ?? existing.humanReadableName,
      trigger: input.trigger ?? existing.trigger,
      content: updatedContent,
      keyboard: updatedKeyboard,
      hidden: input.hidden ?? existing.hidden,
      isAi: input.isAi ?? existing.isAi,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    });

    const saved = await this.stepRepository.update(id, updated);
    return StepDTO.fromEntity(saved);
  }

  /**
   * Deletes a step by ID.
   *
   * Orphan references are allowed (welcome-step on bot-settings, or other
   * content pointing at this id). Viber's cache skips missing steps.
   */
  async delete(id: string): Promise<void> {
    const step = await this.stepRepository.findById(id);
    if (!step) {
      throw new Error(`Step with ID ${id} not found`);
    }
    await this.stepRepository.delete(id);
  }

  async findByTrigger(trigger: string): Promise<StepDTO[]> {
    const steps = await this.stepRepository.findByTrigger(trigger);
    return steps.map((step) => StepDTO.fromEntity(step));
  }

  private async assertMessagesExist(messageIds: string[]): Promise<void> {
    for (const messageId of messageIds) {
      const exists = await this.messageRepository.exists(messageId);
      if (!exists) {
        throw new Error(`Message with ID ${messageId} not found`);
      }
    }
  }

  private async assertKeyboardExists(keyboardId: string | null): Promise<void> {
    if (keyboardId === null) {
      return;
    }
    const exists = await this.keyboardRepository.exists(keyboardId);
    if (!exists) {
      throw new Error(`Keyboard with ID ${keyboardId} not found`);
    }
  }
}
