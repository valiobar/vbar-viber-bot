/**
 * MongoDB BotInstance Repository Implementation
 *
 * Implements the BotInstanceRepository interface using Mongoose.
 * Handles conversion between MongoDB documents and BotInstance domain entities.
 * Manages token encryption/decryption using TokenEncryptionService.
 */

import { Model, Types } from "mongoose";
import { BotInstance } from "../../../entities/BotInstance";
import {
  BotInstanceRepository,
  BotInstanceFilters,
  FindAllResult,
} from "../../../ports/out/BotInstanceRepository";
import {
  BotInstanceModel,
  IBotInstanceDocument,
} from "../models/BotInstanceModel";
import { TokenEncryptionService } from "../../../services/TokenEncryptionService";
import { PaginationParams } from "@vbar/shared";

/**
 * MongoDB BotInstance Repository
 *
 * Implements bot instance persistence operations using MongoDB/Mongoose.
 * Handles token encryption/decryption automatically.
 */
export class MongoBotInstanceRepository implements BotInstanceRepository {
  constructor(
    private readonly botInstanceModel: Model<IBotInstanceDocument>,
    private readonly tokenEncryptionService: TokenEncryptionService
  ) {}

  /**
   * Creates a new bot instance in the database
   * Encrypts token before saving
   *
   * @param botInstance - BotInstance entity to create
   * @returns Created bot instance with generated ID and decrypted token
   */
  async create(botInstance: BotInstance): Promise<BotInstance> {
    // Encrypt token before saving
    const encryptedToken = this.tokenEncryptionService.encrypt(botInstance.token);

    const document = this.entityToDocument(botInstance, encryptedToken);
    const savedDoc = await this.botInstanceModel.create(document);
    return this.documentToEntity(savedDoc);
  }

  /**
   * Finds a bot instance by ID
   * Decrypts token when converting to entity
   *
   * @param id - BotInstance ID
   * @returns BotInstance entity or null if not found
   */
  async findById(id: string): Promise<BotInstance | null> {
    const doc = await this.botInstanceModel.findById(id).exec();

    if (!doc) {
      return null;
    }

    return this.documentToEntity(doc);
  }

  /**
   * Finds a bot instance by botId (unique identifier)
   * Decrypts token when converting to entity
   *
   * @param botId - Bot ID (unique identifier)
   * @returns BotInstance entity or null if not found
   */
  async findByBotId(botId: string): Promise<BotInstance | null> {
    const doc = await this.botInstanceModel.findOne({ botId }).exec();

    if (!doc) {
      return null;
    }

    return this.documentToEntity(doc);
  }

  /**
   * Finds all bot instances with optional filtering and pagination
   * Decrypts tokens when converting to entities
   *
   * @param filters - Optional filter options (platform, status, search)
   * @param pagination - Optional pagination parameters
   * @returns Object containing botInstances array and total count
   */
  async findAll(
    filters?: BotInstanceFilters,
    pagination?: PaginationParams
  ): Promise<FindAllResult> {
    const query = this.buildQuery(filters);

    // Get total count
    const total = await this.botInstanceModel.countDocuments(query).exec();

    // Build query with pagination
    let mongooseQuery = this.botInstanceModel.find(query);

    // Apply pagination
    if (pagination && pagination.page && pagination.limit) {
      const skip = (pagination.page - 1) * pagination.limit;
      mongooseQuery = mongooseQuery.skip(skip).limit(pagination.limit);
    }

    // Apply sorting (default: createdAt descending)
    mongooseQuery = mongooseQuery.sort({ createdAt: -1 });

    const docs = await mongooseQuery.exec();

    // Convert documents to entities with error tolerance to avoid failing the entire list
    const botInstances: BotInstance[] = [];
    for (const doc of docs) {
      try {
        botInstances.push(this.documentToEntity(doc));
      } catch (error) {
        // Log and skip invalid documents to prevent 500s on list endpoint
        console.error(
          "Failed to convert bot instance document to entity",
          { id: doc._id?.toString?.(), botId: doc.botId },
          error
        );
      }
    }

    return {
      botInstances,
      // Use the actual database count for correct pagination
      // Even if some bot instances fail conversion, pagination should reflect the real total
      total,
    };
  }

  /**
   * Updates an existing bot instance
   * Encrypts token if provided in updates, decrypts token in returned entity
   *
   * @param id - BotInstance ID
   * @param updates - Partial updates to apply
   * @returns Updated bot instance entity
   * @throws Error if bot instance not found
   */
  async update(
    id: string,
    updates: Partial<BotInstance>
  ): Promise<BotInstance> {
    // Get existing bot instance to merge updates
    const existingDoc = await this.botInstanceModel.findById(id).exec();

    if (!existingDoc) {
      throw new Error(`BotInstance with id ${id} not found`);
    }

    // Prepare update data
    const updateData: any = {};

    // Handle token encryption if token is being updated
    if (updates.token !== undefined) {
      updateData.token = this.tokenEncryptionService.encrypt(updates.token);
    }

    // Handle other fields
    if (updates.name !== undefined) {
      updateData.name = updates.name;
    }
    if (updates.platform !== undefined) {
      updateData.platform = updates.platform;
    }
    if (updates.status !== undefined) {
      updateData.status = updates.status;
    }
    if (updates.botId !== undefined) {
      updateData.botId = updates.botId;
    }
    if (updates.botViberName !== undefined) {
      updateData.botViberName = updates.botViberName;
    }
    if (updates.botTelegramUsername !== undefined) {
      updateData.botTelegramUsername = updates.botTelegramUsername;
    }
    if (updates.botTelegramDescription !== undefined) {
      updateData.botTelegramDescription = updates.botTelegramDescription;
    }
    if (updates.commands !== undefined) {
      updateData.commands = updates.commands ?? undefined;
    }
    if (updates.avatarURL !== undefined) {
      updateData.avatarURL = updates.avatarURL;
    }
    if (updates.buttonsBackground !== undefined) {
      updateData.buttonsBackground = updates.buttonsBackground;
    }
    if (updates.buttonsTextColor !== undefined) {
      updateData.buttonsTextColor = updates.buttonsTextColor;
    }
    if (updates.buttonsPrefix !== undefined) {
      updateData.buttonsPrefix = updates.buttonsPrefix;
    }
    if (updates.welcomeStepId !== undefined) {
      updateData.welcomeStepId =
        updates.welcomeStepId === null
          ? null
          : new Types.ObjectId(updates.welcomeStepId);
    }
    if (updates.GAKey !== undefined) {
      updateData.GAKey = updates.GAKey;
    }

    // Update document
    const updatedDoc = await this.botInstanceModel
      .findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .exec();

    if (!updatedDoc) {
      throw new Error(`BotInstance with id ${id} not found`);
    }

    return this.documentToEntity(updatedDoc);
  }

  /**
   * Deletes a bot instance by ID
   *
   * @param id - BotInstance ID to delete
   * @throws Error if bot instance not found
   */
  async delete(id: string): Promise<void> {
    const result = await this.botInstanceModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new Error(`BotInstance with id ${id} not found`);
    }
  }

  /**
   * Checks if a bot instance exists by ID
   *
   * @param id - BotInstance ID to check
   * @returns True if bot instance exists, false otherwise
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.botInstanceModel
      .countDocuments({ _id: id })
      .exec();
    return count > 0;
  }

  /**
   * Converts MongoDB document to BotInstance domain entity
   * Decrypts token during conversion
   *
   * @param doc - MongoDB document
   * @returns BotInstance domain entity
   */
  private documentToEntity(doc: IBotInstanceDocument): BotInstance {
    // Decrypt token
    const decryptedToken = this.tokenEncryptionService.decrypt(doc.token);

    return BotInstance.fromDatabaseDocument({
      _id: doc._id,
      name: doc.name,
      platform: doc.platform,
      token: decryptedToken, // Use decrypted token
      status: doc.status,
      botId: doc.botId,
      botViberName: doc.botViberName ?? null,
      botTelegramUsername: doc.botTelegramUsername ?? null,
      botTelegramDescription: doc.botTelegramDescription ?? null,
      commands: doc.commands,
      avatarURL: doc.avatarURL ?? null,
      buttonsBackground: doc.buttonsBackground ?? null,
      buttonsTextColor: doc.buttonsTextColor ?? null,
      buttonsPrefix: doc.buttonsPrefix ?? null,
      welcomeStepId: doc.welcomeStepId,
      GAKey: doc.GAKey ?? null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  /**
   * Converts BotInstance domain entity to MongoDB document format
   * Token should already be encrypted before calling this method
   *
   * @param botInstance - BotInstance domain entity
   * @param encryptedToken - Encrypted token (already encrypted)
   * @returns MongoDB document object
   */
  private entityToDocument(
    botInstance: BotInstance,
    encryptedToken: string
  ): Partial<IBotInstanceDocument> {
    // Convert welcomeStepId reference (optional) to ObjectId or null
    let welcomeStepId: Types.ObjectId | null = null;
    if (botInstance.welcomeStepId) {
      welcomeStepId = new Types.ObjectId(botInstance.welcomeStepId);
    }

    return {
      name: botInstance.name,
      platform: botInstance.platform,
      token: encryptedToken, // Use encrypted token
      status: botInstance.status,
      botId: botInstance.botId,
      botViberName: botInstance.botViberName ?? null,
      botTelegramUsername: botInstance.botTelegramUsername ?? null,
      botTelegramDescription: botInstance.botTelegramDescription ?? null,
      commands: botInstance.commands ?? undefined,
      avatarURL: botInstance.avatarURL ?? null,
      buttonsBackground: botInstance.buttonsBackground ?? null,
      buttonsTextColor: botInstance.buttonsTextColor ?? null,
      buttonsPrefix: botInstance.buttonsPrefix ?? null,
      welcomeStepId,
      GAKey: botInstance.GAKey ?? null,
      createdAt: new Date(botInstance.createdAt),
      updatedAt: new Date(botInstance.updatedAt),
    };
  }

  /**
   * Builds Mongoose query from filters
   *
   * @param filters - Filter options
   * @returns Mongoose query object
   */
  private buildQuery(filters?: BotInstanceFilters): any {
    const query: any = {};

    if (filters) {
      if (filters.platform !== undefined) {
        query.platform = filters.platform;
      }

      if (filters.status !== undefined) {
        query.status = filters.status;
      }

      if (filters.search) {
        // Search in name or botId using case-insensitive regex
        query.$or = [
          { name: { $regex: filters.search, $options: "i" } },
          { botId: { $regex: filters.search, $options: "i" } },
        ];
      }
    }

    return query;
  }
}

/**
 * Factory function to create MongoBotInstanceRepository instance
 *
 * @param tokenEncryptionService - TokenEncryptionService instance
 * @returns MongoBotInstanceRepository instance
 */
export function createMongoBotInstanceRepository(
  tokenEncryptionService: TokenEncryptionService
): MongoBotInstanceRepository {
  return new MongoBotInstanceRepository(
    BotInstanceModel,
    tokenEncryptionService
  );
}

