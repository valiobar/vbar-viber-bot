/**
 * MongoDB Message Repository Implementation
 *
 * Implements the MessageRepository interface using Mongoose.
 * Handles conversion between MongoDB documents and Message domain entities.
 */

import { Model } from "mongoose";
import { Message } from "../../../entities/Message";
import {
  MessageRepository,
  MessageFilters,
  FindAllResult,
} from "../../../ports/out/MessageRepository";
import { MessageModel, IMessageDocument } from "../models/MessageModel";
import { PaginationParams } from "@vbar/shared";

/**
 * MongoDB Message Repository
 *
 * Implements message persistence operations using MongoDB/Mongoose.
 */
export class MongoMessageRepository implements MessageRepository {
  constructor(private readonly messageModel: Model<IMessageDocument>) {}

  /**
   * Creates a new message in the database
   *
   * @param message - Message entity to create
   * @returns Created message with generated ID
   */
  async create(message: Message): Promise<Message> {
    const document = this.entityToDocument(message);
    const savedDoc = await this.messageModel.create(document);
    return this.documentToEntity(savedDoc);
  }

  /**
   * Updates an existing message
   *
   * @param id - Message ID
   * @param message - Updated message entity
   * @returns Updated message entity
   * @throws Error if message not found
   */
  async update(id: string, message: Message): Promise<Message> {
    const document = this.entityToDocument(message);

    // Remove _id from document to avoid conflicts
    const { _id, ...updateData } = document as any;

    const updatedDoc = await this.messageModel
      .findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .exec();

    if (!updatedDoc) {
      throw new Error(`Message with id ${id} not found`);
    }

    return this.documentToEntity(updatedDoc);
  }

  /**
   * Deletes a message by ID
   *
   * @param id - Message ID to delete
   * @throws Error if message not found
   */
  async delete(id: string): Promise<void> {
    const result = await this.messageModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new Error(`Message with id ${id} not found`);
    }
  }

  /**
   * Finds a message by ID
   *
   * @param id - Message ID
   * @returns Message entity or null if not found
   */
  async findById(id: string): Promise<Message | null> {
    const doc = await this.messageModel.findById(id).exec();

    if (!doc) {
      return null;
    }

    return this.documentToEntity(doc);
  }

  /**
   * Finds all messages with optional filtering and pagination
   *
   * @param filters - Optional filter options (hidden, type, search)
   * @param pagination - Optional pagination parameters
   * @returns Object containing messages array and total count
   */
  async findAll(
    filters?: MessageFilters,
    pagination?: PaginationParams
  ): Promise<FindAllResult> {
    const query = this.buildQuery(filters);

    // Get total count
    const total = await this.messageModel.countDocuments(query).exec();

    // Build query with pagination
    let mongooseQuery = this.messageModel.find(query);

    // Apply pagination
    if (pagination && pagination.page && pagination.limit) {
      const skip = (pagination.page - 1) * pagination.limit;
      mongooseQuery = mongooseQuery.skip(skip).limit(pagination.limit);
    }

    // Apply sorting (default: createdAt descending)
    mongooseQuery = mongooseQuery.sort({ createdAt: -1 });

    const docs = await mongooseQuery.exec();

    // Convert documents to entities with error tolerance to avoid failing the entire list
    const messages: Message[] = [];
    for (const doc of docs) {
      try {
        messages.push(this.documentToEntity(doc));
      } catch (error) {
        // Log and skip invalid documents to prevent 500s on list endpoint
        console.error(
          "Failed to convert message document to entity",
          { id: doc._id?.toString?.(), type: doc.type },
          error
        );
      }
    }

    return {
      messages,
      // Use the actual database count for correct pagination
      // Even if some messages fail conversion, pagination should reflect the real total
      total,
    };
  }

  /**
   * Checks if a message exists by ID
   *
   * @param id - Message ID to check
   * @returns True if message exists, false otherwise
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.messageModel.countDocuments({ _id: id }).exec();
    return count > 0;
  }

  /**
   * Converts MongoDB document to Message domain entity
   *
   * @param doc - MongoDB document
   * @returns Message domain entity
   */
  private documentToEntity(doc: IMessageDocument): Message {
    // Handle missing or null content for URL and rich-media types
    // These types don't require content, so default to empty object
    let content = doc.content;
    if (
      (!content || typeof content !== "object") &&
      (doc.type === "url" || doc.type === "rich-media")
    ) {
      content = {};
    }

    return Message.fromDatabaseDocument({
      _id: doc._id,
      type: doc.type,
      content: content,
      url: doc.url,
      humanReadableName: doc.humanReadableName,
      hidden: doc.hidden,
      botId: doc.botId,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  /**
   * Converts Message domain entity to MongoDB document format
   *
   * @param message - Message domain entity
   * @returns MongoDB document object
   */
  private entityToDocument(message: Message): Partial<IMessageDocument> {
    return {
      type: message.type,
      content: message.content.getData(),
      url: message.url,
      humanReadableName: message.humanReadableName,
      hidden: message.hidden,
      botId: message.botId,
      createdAt: new Date(message.createdAt),
      updatedAt: new Date(message.updatedAt),
    };
  }

  /**
   * Builds Mongoose query from filters
   *
   * @param filters - Filter options
   * @returns Mongoose query object
   */
  private buildQuery(filters?: MessageFilters): any {
    const query: any = {};

    if (filters) {
      if (filters.hidden !== undefined) {
        query.hidden = filters.hidden;
      }

      if (filters.type !== undefined) {
        query.type = filters.type;
      }

      if (filters.search) {
        // Search in humanReadableName using case-insensitive regex
        query.humanReadableName = { $regex: filters.search, $options: "i" };
      }

      if (filters.botId !== undefined) {
        query.botId = filters.botId;
      }
    }

    return query;
  }
}

/**
 * Factory function to create MongoMessageRepository instance
 *
 * @returns MongoMessageRepository instance
 */
export function createMongoMessageRepository(): MongoMessageRepository {
  return new MongoMessageRepository(MessageModel);
}
