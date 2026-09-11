/**
 * Broadcast application service
 *
 * Route → service → repository for broadcast CRUD plus claim/progress
 * used by viber workers. Create/update validate the referenced step
 * (must exist and must not be hidden — viber only caches visible steps).
 */

import type {
  BroadcastDTO,
  BroadcastProgressUpdate,
  PaginationParams,
} from "@vbar/shared";
import { paginate } from "@/lib/api/paginate";
import {
  BroadcastRepository,
  type CreateBroadcastData,
} from "./BroadcastRepository";
import { StepRepository } from "../step/StepRepository";

export interface CreateBroadcastInput {
  name: string;
  stepId: string;
  sendToAll?: boolean;
  testViberIds?: string[];
  scheduledAt?: string; // ISO; omitted = send now
}

export interface ListBroadcastsResult {
  broadcasts: BroadcastDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class BroadcastService {
  constructor(
    private readonly broadcastRepository: BroadcastRepository,
    private readonly stepRepository: StepRepository
  ) {}

  async list(pagination?: PaginationParams): Promise<ListBroadcastsResult> {
    const result = await this.broadcastRepository.findAll(pagination);
    return {
      broadcasts: result.broadcasts,
      total: result.total,
      ...paginate(result.total, pagination),
    };
  }

  async get(id: string): Promise<BroadcastDTO> {
    const broadcast = await this.broadcastRepository.findById(id);
    if (!broadcast) {
      throw new Error(`Broadcast with ID ${id} not found`);
    }
    return broadcast;
  }

  async create(input: CreateBroadcastInput): Promise<BroadcastDTO> {
    const data = await this.validateInput(input);
    return this.broadcastRepository.create(data);
  }

  async update(id: string, input: CreateBroadcastInput): Promise<BroadcastDTO> {
    const data = await this.validateInput(input);
    const updated = await this.broadcastRepository.updateScheduled(id, data);
    if (!updated) {
      throw new Error(`Broadcast with ID ${id} not found or is no longer scheduled`);
    }
    return updated;
  }

  async cancel(id: string): Promise<BroadcastDTO> {
    const canceled = await this.broadcastRepository.cancelScheduled(id);
    if (!canceled) {
      throw new Error(`Broadcast with ID ${id} not found or is no longer scheduled`);
    }
    return canceled;
  }

  async claim(instanceId: string, staleMs: number): Promise<BroadcastDTO | null> {
    return this.broadcastRepository.claimDue(instanceId, staleMs);
  }

  async reportProgress(
    id: string,
    update: BroadcastProgressUpdate
  ): Promise<BroadcastDTO> {
    const updated = await this.broadcastRepository.updateProgress(id, update);
    if (!updated) {
      // Not found, already terminal, or the caller lost the lock to another instance
      throw new Error(
        `Broadcast ${id} progress rejected: invalid lock for instance ${update.instanceId}`
      );
    }
    return updated;
  }

  private async validateInput(
    input: CreateBroadcastInput
  ): Promise<CreateBroadcastData> {
    const step = await this.stepRepository.findById(input.stepId);
    if (!step) {
      throw new Error(`Step with ID ${input.stepId} not found`);
    }
    if (step.hidden) {
      throw new Error(
        "Validation: broadcast step must not be hidden (hidden steps are not cached by the viber service)"
      );
    }

    const sendToAll = input.sendToAll ?? false;
    const testViberIds = (input.testViberIds ?? [])
      .map((s) => s.trim())
      .filter(Boolean);
    if (!sendToAll && testViberIds.length === 0) {
      throw new Error(
        "Validation: testViberIds is required when sendToAll is false"
      );
    }

    const scheduledAt = input.scheduledAt
      ? new Date(input.scheduledAt)
      : new Date();
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new Error("Validation: scheduledAt is invalid");
    }

    return {
      name: input.name.trim(),
      stepId: input.stepId,
      sendToAll,
      testViberIds,
      scheduledAt,
    };
  }
}
