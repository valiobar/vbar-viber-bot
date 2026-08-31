/**
 * MongoDB Session Repository Implementation using Mongoose
 *
 * Implements the SessionRepository interface using Mongoose.
 * This is an output adapter following Hexagonal Architecture principles.
 * Includes TTL index on expiresAt for automatic cleanup of expired sessions.
 */

import { connectToDatabase } from "@/lib/mongodb";
import type {
  SessionRepository,
  Session,
} from "../../../ports/out/SessionRepository";
import { SessionModel, type ISessionDocument } from "../models/SessionModel";

/**
 * MongoDB Session Repository using Mongoose
 *
 * Implements session data persistence operations using Mongoose models.
 * Automatically cleans up expired sessions using TTL index.
 */
export class MongoSessionRepository implements SessionRepository {
  /**
   * Ensures database connection is established
   */
  private async ensureConnection(): Promise<void> {
    await connectToDatabase();
  }

  /**
   * Converts Mongoose document to Session entity
   *
   * @param doc - Mongoose document
   * @returns Session entity
   */
  private toSessionEntity(doc: ISessionDocument): Session {
    return {
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      refreshToken: doc.refreshToken,
      expiresAt: doc.expiresAt,
      createdAt: doc.createdAt,
    };
  }

  /**
   * Creates a new session
   *
   * @param session - Session data to create
   * @returns Created session entity with generated ID
   * @throws Error if session already exists or database operation fails
   */
  async create(session: Omit<Session, "id" | "createdAt">): Promise<Session> {
    try {
      await this.ensureConnection();

      // Check if session with same refresh token already exists
      const existingSession = await this.findByToken(session.refreshToken);
      if (existingSession) {
        throw new Error("Session with this refresh token already exists");
      }

      // Create new session document
      const doc = new SessionModel({
        userId: session.userId,
        refreshToken: session.refreshToken,
        expiresAt:
          session.expiresAt instanceof Date
            ? session.expiresAt
            : new Date(session.expiresAt),
      });

      const savedDoc = await doc.save();
      return this.toSessionEntity(savedDoc);
    } catch (error) {
      if (error instanceof Error && error.message.includes("already exists")) {
        throw error;
      }
      // Handle duplicate key error (unique index violation)
      if (
        error instanceof Error &&
        (error.message.includes("duplicate key") ||
          error.message.includes("E11000"))
      ) {
        throw new Error("Session with this refresh token already exists");
      }
      throw new Error(
        `Failed to create session: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Finds a session by refresh token
   *
   * @param refreshToken - Refresh token to search for
   * @returns Session entity if found, null otherwise
   * @throws Error if database operation fails
   */
  async findByToken(refreshToken: string): Promise<Session | null> {
    try {
      await this.ensureConnection();
      const doc = await SessionModel.findOne({ refreshToken }).exec();

      if (!doc) {
        return null;
      }

      // Check if session is expired (even if TTL hasn't cleaned it up yet)
      if (doc.expiresAt < new Date()) {
        // Session is expired, delete it and return null
        await SessionModel.findByIdAndDelete(doc._id).exec();
        return null;
      }

      return this.toSessionEntity(doc);
    } catch (error) {
      throw new Error(
        `Failed to find session by token: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Deletes a session by refresh token
   *
   * @param refreshToken - Refresh token to delete
   * @returns True if session was deleted, false if session not found
   * @throws Error if database operation fails
   */
  async deleteByToken(refreshToken: string): Promise<boolean> {
    try {
      await this.ensureConnection();
      const result = await SessionModel.findOneAndDelete({
        refreshToken,
      }).exec();

      return result !== null;
    } catch (error) {
      throw new Error(
        `Failed to delete session by token: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Deletes all sessions for a specific user
   *
   * @param userId - User ID whose sessions should be deleted
   * @returns Number of sessions deleted
   * @throws Error if database operation fails
   */
  async deleteByUserId(userId: string): Promise<number> {
    try {
      await this.ensureConnection();
      const result = await SessionModel.deleteMany({ userId }).exec();

      return result.deletedCount || 0;
    } catch (error) {
      throw new Error(
        `Failed to delete sessions by user ID: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Deletes all expired sessions
   *
   * @returns Number of expired sessions deleted
   * @throws Error if database operation fails
   */
  async deleteExpired(): Promise<number> {
    try {
      await this.ensureConnection();
      const now = new Date();
      const result = await SessionModel.deleteMany({
        expiresAt: { $lt: now },
      }).exec();

      return result.deletedCount || 0;
    } catch (error) {
      throw new Error(
        `Failed to delete expired sessions: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
