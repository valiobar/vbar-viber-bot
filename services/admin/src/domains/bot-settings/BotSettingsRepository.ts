/**
 * MongoDB BotSettings Repository
 *
 * Handles conversion between MongoDB documents and BotSettings domain entities.
 * Bot Settings follow a singleton pattern (only one settings document exists).
 */

import { Model, Types } from "mongoose";
import { BotSettings } from "./BotSettings";
import { IBotSettingsDocument } from "./BotSettingsModel";

/**
 * Bot settings persistence operations using MongoDB/Mongoose.
 * Uses singleton pattern - only one settings document exists.
 */
export class BotSettingsRepository {
  constructor(private readonly botSettingsModel: Model<IBotSettingsDocument>) {}

  /**
   * Finds the bot settings (singleton pattern)
   *
   * @returns BotSettings entity or null if no settings exist
   */
  async findOne(): Promise<BotSettings | null> {
    // Since bot settings is a singleton, find any document
    // In practice, there should only be one document
    const doc = await this.botSettingsModel.findOne().exec();

    if (!doc) {
      return null;
    }

    return this.documentToEntity(doc);
  }

  /**
   * Saves bot settings (creates new or updates existing)
   *
   * @param settings - BotSettings entity to save
   * @returns Saved BotSettings entity with generated/updated ID
   */
  async save(settings: BotSettings): Promise<BotSettings> {
    // Check if settings already exist
    const existingDoc = await this.botSettingsModel.findOne().exec();

    if (existingDoc) {
      // Update existing document
      const document = this.entityToDocument(settings);
      const { _id, ...updateData } = document as any;

      const updatedDoc = await this.botSettingsModel
        .findByIdAndUpdate(existingDoc._id, updateData, {
          new: true,
          runValidators: true,
        })
        .exec();

      if (!updatedDoc) {
        throw new Error("Failed to update bot settings");
      }

      return this.documentToEntity(updatedDoc);
    } else {
      // Create new document
      const document = this.entityToDocument(settings);
      const savedDoc = await this.botSettingsModel.create(document);
      return this.documentToEntity(savedDoc);
    }
  }

  /**
   * Updates bot settings with partial updates
   *
   * @param id - BotSettings ID
   * @param updates - Partial updates to apply
   * @returns Updated BotSettings entity
   * @throws Error if settings not found
   */
  async update(
    id: string,
    updates: Partial<BotSettings>
  ): Promise<BotSettings> {
    // Convert partial updates to document format
    const updateData: Partial<IBotSettingsDocument> = {};

    if (updates.avatarURL !== undefined) {
      updateData.avatarURL = updates.avatarURL;
    }
    if (updates.botName !== undefined) {
      updateData.botName = updates.botName;
    }
    if (updates.botViberName !== undefined) {
      updateData.botViberName = updates.botViberName;
    }
    if (updates.status !== undefined) {
      updateData.status = updates.status;
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

    // Use findOneAndUpdate with upsert to ensure only one document exists
    // This enforces the singleton pattern
    const updatedDoc = await this.botSettingsModel
      .findOneAndUpdate({ _id: id }, updateData, {
        new: true,
        runValidators: true,
        upsert: false, // Don't create if not found, throw error instead
      })
      .exec();

    if (!updatedDoc) {
      throw new Error(`Bot settings with id ${id} not found`);
    }

    return this.documentToEntity(updatedDoc);
  }

  /**
   * Converts MongoDB document to BotSettings domain entity
   *
   * @param doc - MongoDB document
   * @returns BotSettings domain entity
   */
  private documentToEntity(doc: IBotSettingsDocument): BotSettings {
    return BotSettings.fromDatabaseDocument({
      _id: doc._id,
      avatarURL: doc.avatarURL,
      botName: doc.botName,
      botViberName: doc.botViberName,
      status: doc.status,
      buttonsBackground: doc.buttonsBackground,
      buttonsTextColor: doc.buttonsTextColor,
      buttonsPrefix: doc.buttonsPrefix,
      welcomeStepId: doc.welcomeStepId,
      GAKey: doc.GAKey,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  /**
   * Converts BotSettings domain entity to MongoDB document format
   *
   * @param settings - BotSettings domain entity
   * @returns MongoDB document object
   */
  private entityToDocument(
    settings: BotSettings
  ): Partial<IBotSettingsDocument> {
    return {
      avatarURL: settings.avatarURL,
      botName: settings.botName,
      botViberName: settings.botViberName,
      status: settings.status,
      buttonsBackground: settings.buttonsBackground,
      buttonsTextColor: settings.buttonsTextColor,
      buttonsPrefix: settings.buttonsPrefix,
      welcomeStepId:
        settings.welcomeStepId === null
          ? null
          : new Types.ObjectId(settings.welcomeStepId),
      GAKey: settings.GAKey,
      createdAt: new Date(settings.createdAt),
      updatedAt: new Date(settings.updatedAt),
    };
  }
}
