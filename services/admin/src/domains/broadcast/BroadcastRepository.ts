/**
 * MongoDB Broadcast Repository
 *
 * Concrete Mongo repository (no port interface). Broadcasts have no domain
 * behavior, so documents map straight to the shared BroadcastDTO.
 */

import { Model, Types } from "mongoose";
import type {
  BroadcastDTO,
  BroadcastProgressUpdate,
  PaginationParams,
} from "@vbar/shared";
import { IBroadcastDocument } from "./BroadcastModel";

export interface CreateBroadcastData {
  name: string;
  stepId: string;
  sendToAll: boolean;
  testViberIds: string[];
  scheduledAt: Date;
}

export class BroadcastRepository {
  constructor(private readonly model: Model<IBroadcastDocument>) {}

  /**
   * Creates a new scheduled broadcast
   */
  async create(data: CreateBroadcastData): Promise<BroadcastDTO> {
    const doc = await this.model.create({
      name: data.name,
      stepId: new Types.ObjectId(data.stepId),
      sendToAll: data.sendToAll,
      testViberIds: data.testViberIds,
      scheduledAt: data.scheduledAt,
      status: "scheduled",
    });
    return this.toDTO(doc);
  }

  /**
   * Lists broadcasts newest-first, with optional pagination
   */
  async findAll(
    pagination?: PaginationParams
  ): Promise<{ broadcasts: BroadcastDTO[]; total: number }> {
    const total = await this.model.countDocuments().exec();
    let query = this.model.find().sort({ createdAt: -1 });
    if (pagination?.page && pagination?.limit) {
      query = query
        .skip((pagination.page - 1) * pagination.limit)
        .limit(pagination.limit);
    }
    const docs = await query.exec();
    return { broadcasts: docs.map((d) => this.toDTO(d)), total };
  }

  /**
   * Finds a broadcast by ID
   */
  async findById(id: string): Promise<BroadcastDTO | null> {
    const doc = await this.model.findById(id).exec();
    return doc ? this.toDTO(doc) : null;
  }

  /**
   * Only scheduled broadcasts can be updated.
   * Returns null when not found or not scheduled.
   */
  async updateScheduled(
    id: string,
    data: Partial<CreateBroadcastData>
  ): Promise<BroadcastDTO | null> {
    const update: Record<string, unknown> = { ...data, updatedAt: new Date() };
    if (data.stepId) update.stepId = new Types.ObjectId(data.stepId);
    const doc = await this.model
      .findOneAndUpdate({ _id: id, status: "scheduled" }, { $set: update }, { new: true })
      .exec();
    return doc ? this.toDTO(doc) : null;
  }

  /**
   * Cancel: atomic guard — only a scheduled broadcast can be canceled.
   */
  async cancelScheduled(id: string): Promise<BroadcastDTO | null> {
    const doc = await this.model
      .findOneAndUpdate(
        { _id: id, status: "scheduled" },
        { $set: { status: "canceled", updatedAt: new Date() } },
        { new: true }
      )
      .exec();
    return doc ? this.toDTO(doc) : null;
  }

  /**
   * CLUSTER-SAFE CLAIM.
   * Single atomic findOneAndUpdate — MongoDB guarantees at most one caller
   * transitions a given document, no matter how many instances poll at once.
   * Also re-claims broadcasts stuck in "sending" whose heartbeat went stale
   * (owning instance crashed).
   */
  async claimDue(
    instanceId: string,
    staleMs: number
  ): Promise<BroadcastDTO | null> {
    const now = new Date();
    const staleBefore = new Date(now.getTime() - staleMs);
    const doc = await this.model
      .findOneAndUpdate(
        {
          $or: [
            { status: "scheduled", scheduledAt: { $lte: now } },
            { status: "sending", lastHeartbeatAt: { $lt: staleBefore } },
          ],
        },
        {
          $set: {
            status: "sending",
            lockedBy: instanceId,
            lockedAt: now,
            lastHeartbeatAt: now,
            startedAt: now,
            updatedAt: now,
          },
        },
        { sort: { scheduledAt: 1 }, new: true }
      )
      .exec();
    return doc ? this.toDTO(doc) : null;
  }

  /**
   * Progress/heartbeat write, rejected when the caller no longer holds the lock.
   */
  async updateProgress(
    id: string,
    update: BroadcastProgressUpdate
  ): Promise<BroadcastDTO | null> {
    const now = new Date();
    const set: Record<string, unknown> = {
      successCount: update.successCount,
      failedList: update.failedList,
      lastHeartbeatAt: now,
      updatedAt: now,
    };
    if (update.totalCount !== undefined) set.totalCount = update.totalCount;
    if (update.lastProcessedId !== undefined) {
      set.lastProcessedId = update.lastProcessedId;
    }
    if (update.status) {
      set.status = update.status;
      set.finishedAt = now;
      if (update.errorMessage) set.errorMessage = update.errorMessage;
    }
    const doc = await this.model
      .findOneAndUpdate(
        { _id: id, status: "sending", lockedBy: update.instanceId },
        { $set: set },
        { new: true }
      )
      .exec();
    return doc ? this.toDTO(doc) : null;
  }

  private toDTO(doc: IBroadcastDocument): BroadcastDTO {
    return {
      id: String(doc._id),
      name: doc.name,
      stepId: doc.stepId.toString(),
      sendToAll: doc.sendToAll,
      testViberIds: doc.testViberIds,
      scheduledAt: doc.scheduledAt.toISOString(),
      status: doc.status,
      totalCount: doc.totalCount,
      successCount: doc.successCount,
      failedList: (doc.failedList ?? []).map((entry) => ({
        viberId: entry.viberId,
        reason: entry.reason,
      })),
      startedAt: doc.startedAt?.toISOString() ?? null,
      finishedAt: doc.finishedAt?.toISOString() ?? null,
      lockedBy: doc.lockedBy,
      lastProcessedId: doc.lastProcessedId ?? null,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }
}
