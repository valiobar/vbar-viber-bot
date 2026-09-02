/**
 * MongoDB User Repository
 *
 * User persistence operations using Mongoose models.
 */

import { connectToDatabase } from "@/lib/mongodb";
import { User } from "./User";
import { UserModel, type IUserDocument } from "./UserModel";

/**
 * User persistence operations using MongoDB/Mongoose.
 */
export class UserRepository {
  /**
   * Ensures database connection is established
   */
  private async ensureConnection(): Promise<void> {
    await connectToDatabase();
  }

  /**
   * Converts Mongoose document to User domain entity
   *
   * @param doc - Mongoose document
   * @returns User domain entity
   */
  private toUserEntity(doc: IUserDocument): User {
    return User.fromDatabaseDocument({
      _id: doc._id.toString(),
      username: doc.username,
      email: doc.email,
      passwordHash: doc.passwordHash,
      name: doc.name,
      role: doc.role,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      lastLoginAt: doc.lastLoginAt,
    });
  }

  /**
   * Finds a user by username
   *
   * @param username - Username to search for
   * @returns User entity if found, null otherwise
   * @throws Error if database operation fails
   */
  async findByUsername(username: string): Promise<User | null> {
    try {
      await this.ensureConnection();
      const doc = await UserModel.findOne({
        username: username.toLowerCase().trim(),
      }).exec();

      if (!doc) {
        return null;
      }

      return this.toUserEntity(doc);
    } catch (error) {
      throw new Error(
        `Failed to find user by username: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Finds a user by email address
   *
   * @param email - Email address to search for
   * @returns User entity if found, null otherwise
   * @throws Error if database operation fails
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      await this.ensureConnection();
      const doc = await UserModel.findOne({
        email: email.toLowerCase().trim(),
      }).exec();

      if (!doc) {
        return null;
      }

      return this.toUserEntity(doc);
    } catch (error) {
      throw new Error(
        `Failed to find user by email: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Finds a user by ID
   *
   * @param id - User ID to search for
   * @returns User entity if found, null otherwise
   * @throws Error if database operation fails
   */
  async findById(id: string): Promise<User | null> {
    try {
      await this.ensureConnection();
      const doc = await UserModel.findById(id).exec();

      if (!doc) {
        return null;
      }

      return this.toUserEntity(doc);
    } catch (error) {
      throw new Error(
        `Failed to find user by ID: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Creates a new user
   *
   * @param user - User entity to create
   * @returns Created user entity with generated ID
   * @throws Error if user already exists or database operation fails
   */
  async create(user: User): Promise<User> {
    try {
      await this.ensureConnection();

      // Check if user with same username already exists
      const existingUserByUsername = await this.findByUsername(user.username);
      if (existingUserByUsername) {
        throw new Error(`User with username ${user.username} already exists`);
      }

      // Check if user with same email already exists
      const existingUserByEmail = await this.findByEmail(user.email);
      if (existingUserByEmail) {
        throw new Error(`User with email ${user.email} already exists`);
      }

      // Create new user document
      const doc = new UserModel({
        username: user.username.toLowerCase().trim(),
        email: user.email.toLowerCase().trim(),
        passwordHash: user.passwordHash,
        name: user.name,
        role: user.role,
        ...(user.lastLoginAt && { lastLoginAt: new Date(user.lastLoginAt) }),
      });

      const savedDoc = await doc.save();
      return this.toUserEntity(savedDoc);
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
        if (error.message.includes("username")) {
          throw new Error(`User with username ${user.username} already exists`);
        }
        throw new Error(`User with email ${user.email} already exists`);
      }
      throw new Error(
        `Failed to create user: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Updates an existing user
   *
   * @param id - User ID to update
   * @param updates - Partial user data to update
   * @returns Updated user entity
   * @throws Error if user not found or database operation fails
   */
  async update(id: string, updates: Partial<User>): Promise<User> {
    try {
      await this.ensureConnection();

      // Check if user exists
      const existingUser = await this.findById(id);
      if (!existingUser) {
        throw new Error(`User with ID ${id} not found`);
      }

      // Prepare update document
      const updateDoc: Partial<IUserDocument> = {};

      // Add fields to update (excluding id, createdAt)
      if (updates.username !== undefined) {
        updateDoc.username = updates.username.toLowerCase().trim();
      }
      if (updates.email !== undefined) {
        updateDoc.email = updates.email.toLowerCase().trim();
      }
      if (updates.passwordHash !== undefined) {
        updateDoc.passwordHash = updates.passwordHash;
      }
      if (updates.name !== undefined) {
        updateDoc.name = updates.name;
      }
      if (updates.role !== undefined) {
        updateDoc.role = updates.role;
      }
      if (updates.lastLoginAt !== undefined) {
        updateDoc.lastLoginAt = updates.lastLoginAt
          ? new Date(updates.lastLoginAt)
          : undefined;
      }

      // Update document
      const doc = await UserModel.findByIdAndUpdate(id, updateDoc, {
        new: true,
        runValidators: true,
      }).exec();

      if (!doc) {
        throw new Error(`User with ID ${id} not found`);
      }

      return this.toUserEntity(doc);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        throw error;
      }
      throw new Error(
        `Failed to update user: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Deletes a user by ID
   *
   * @param id - User ID to delete
   * @returns True if user was deleted, false if user not found
   * @throws Error if database operation fails
   */
  async delete(id: string): Promise<boolean> {
    try {
      await this.ensureConnection();
      const result = await UserModel.findByIdAndDelete(id).exec();

      return result !== null;
    } catch (error) {
      throw new Error(
        `Failed to delete user: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
