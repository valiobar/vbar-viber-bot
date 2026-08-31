/**
 * User Repository Interface (Output Port)
 *
 * Defines the contract for user data persistence operations.
 * This is an output port following Hexagonal Architecture principles.
 * Implementations will be provided by adapters (e.g., MongoDB adapter).
 */

import type { User } from "../../entities/User";

/**
 * User repository interface
 *
 * Defines methods for user data persistence operations.
 * All methods return Promises to support asynchronous operations.
 */
export interface UserRepository {
  /**
   * Finds a user by username
   *
   * @param username - Username to search for
   * @returns User entity if found, null otherwise
   * @throws Error if database operation fails
   */
  findByUsername(username: string): Promise<User | null>;

  /**
   * Finds a user by email address
   *
   * @param email - Email address to search for
   * @returns User entity if found, null otherwise
   * @throws Error if database operation fails
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Finds a user by ID
   *
   * @param id - User ID to search for
   * @returns User entity if found, null otherwise
   * @throws Error if database operation fails
   */
  findById(id: string): Promise<User | null>;

  /**
   * Creates a new user
   *
   * @param user - User entity to create
   * @returns Created user entity with generated ID
   * @throws Error if user already exists or database operation fails
   */
  create(user: User): Promise<User>;

  /**
   * Updates an existing user
   *
   * @param id - User ID to update
   * @param updates - Partial user data to update
   * @returns Updated user entity
   * @throws Error if user not found or database operation fails
   */
  update(id: string, updates: Partial<User>): Promise<User>;

  /**
   * Deletes a user by ID
   *
   * @param id - User ID to delete
   * @returns True if user was deleted, false if user not found
   * @throws Error if database operation fails
   */
  delete(id: string): Promise<boolean>;
}
