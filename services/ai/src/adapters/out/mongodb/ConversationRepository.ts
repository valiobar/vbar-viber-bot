/**
 * MongoDB Conversation Repository Adapter
 *
 * Implements ConversationRepository port using MongoDB.
 * Stores and retrieves conversation history from MongoDB collection.
 */

import { ConversationRepository } from "../../../ports/out/ConversationRepository";
import { ConversationContext } from "../../../domains/ai/entities";
import { getDatabase } from "../../../config/database";
import { Logger } from "@vbar/shared";

/**
 * MongoDB Conversation Repository implementation
 *
 * Uses MongoDB native driver to store and retrieve conversation history.
 * Conversations are stored in the "conversations" collection.
 */
export class MongoConversationRepository implements ConversationRepository {
  private readonly collectionName = "conversations";
  private readonly logger: Logger;

  /**
   * Constructor
   *
   * @param logger - Logger instance for logging
   */
  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Get conversation history for a user
   *
   * @param userId - The unique identifier of the user
   * @returns Promise resolving to conversation context or null if not found
   */
  async getConversationHistory(
    userId: string
  ): Promise<ConversationContext | null> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database connection failed");
      }

      const collection = db.collection(this.collectionName);
      const doc = await collection.findOne({ userId });

      if (!doc) {
        return null;
      }

      return this.documentToEntity(doc);
    } catch (error) {
      this.logger.error(
        `Failed to get conversation history for user "${userId}":`,
        error as Error
      );
      throw new Error(
        `Failed to get conversation history: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Save a message to the conversation history
   *
   * @param userId - The unique identifier of the user
   * @param role - The role of the message sender (user or assistant)
   * @param content - The content of the message
   * @returns Promise that resolves when the message is saved
   */
  async saveMessage(
    userId: string,
    role: "user" | "assistant",
    content: string
  ): Promise<void> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database connection failed");
      }

      const collection = db.collection(this.collectionName);
      const timestamp = new Date();

      // Create message object
      const message = {
        role,
        content,
        timestamp,
      };

      // Upsert conversation document: add message to messages array and update timestamp
      await collection.updateOne(
        { userId },
        {
          $set: {
            userId,
            updatedAt: timestamp,
          },
          $push: {
            messages: message,
          },
          $setOnInsert: {
            createdAt: timestamp,
            metadata: {},
          },
        },
        { upsert: true }
      );

      this.logger.info(
        `Saved ${role} message for user "${userId}" (${content.substring(
          0,
          50
        )}...)`
      );
    } catch (error) {
      this.logger.error(
        `Failed to save message for user "${userId}":`,
        error as Error
      );
      throw new Error(
        `Failed to save message: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Clear conversation history for a user
   *
   * @param userId - The unique identifier of the user
   * @returns Promise that resolves when the history is cleared
   */
  async clearConversationHistory(userId: string): Promise<void> {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error("Database connection failed");
      }

      const collection = db.collection(this.collectionName);
      const result = await collection.deleteOne({ userId });

      if (result.deletedCount === 0) {
        this.logger.warn(
          `No conversation history found for user "${userId}" to clear`
        );
        // Don't throw error - clearing non-existent history is acceptable
        return;
      }

      this.logger.info(`Cleared conversation history for user "${userId}"`);
    } catch (error) {
      this.logger.error(
        `Failed to clear conversation history for user "${userId}":`,
        error as Error
      );
      throw new Error(
        `Failed to clear conversation history: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Convert MongoDB document to ConversationContext entity
   *
   * @param doc - MongoDB document
   * @returns ConversationContext entity
   */
  private documentToEntity(doc: any): ConversationContext {
    // Ensure messages array exists and has proper structure
    const messages = (doc.messages || []).map((msg: any) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
      timestamp:
        msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
    }));

    return new ConversationContext(doc.userId, messages, doc.metadata || {});
  }
}
