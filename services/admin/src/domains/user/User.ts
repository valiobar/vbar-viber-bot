/**
 * User Domain Entity
 *
 * Domain entity representing a User in the Admin Service.
 * This extends the User interface from the shared package but adds domain logic,
 * including password hash and validation methods.
 */

import type { User as SharedUser } from "@vbar/shared";

/**
 * User role type
 */
export type UserRole = "admin" | "user" | "viewer";

/**
 * User domain entity
 *
 * Represents a user in the domain layer with business logic and validation.
 * Includes password hash for internal use (not exposed in shared interface).
 */
export class User {
  public readonly id: string;
  public readonly username: string;
  public readonly email: string;
  public readonly passwordHash: string;
  public readonly name: string;
  public readonly role: UserRole;
  public readonly createdAt: string;
  public readonly updatedAt: string;
  public readonly lastLoginAt?: string;

  /**
   * Creates a new User domain entity
   *
   * @param params - User properties
   */
  constructor(params: {
    id: string;
    username: string;
    email: string;
    passwordHash: string;
    name: string;
    role: UserRole;
    createdAt: string;
    updatedAt: string;
    lastLoginAt?: string;
  }) {
    // Validate and set properties
    this.id = params.id;
    this.username = this.validateUsername(params.username);
    this.email = this.validateEmail(params.email);
    this.passwordHash = params.passwordHash;
    this.name = this.validateName(params.name);
    this.role = this.validateRole(params.role);
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;
    this.lastLoginAt = params.lastLoginAt;
  }

  /**
   * Validates username format
   *
   * @param username - Username to validate
   * @returns Validated username
   * @throws Error if username is invalid
   */
  private validateUsername(username: string): string {
    if (!username || typeof username !== "string") {
      throw new Error("Username is required and must be a string");
    }

    const trimmedUsername = username.trim().toLowerCase();

    if (trimmedUsername.length === 0) {
      throw new Error("Username cannot be empty");
    }

    if (trimmedUsername.length < 3) {
      throw new Error("Username must be at least 3 characters long");
    }

    if (trimmedUsername.length > 50) {
      throw new Error("Username must be 50 characters or less");
    }

    // Only allow lowercase letters, numbers, and underscores
    const usernameRegex = /^[a-z0-9_]+$/;
    if (!usernameRegex.test(trimmedUsername)) {
      throw new Error(
        "Username can only contain lowercase letters, numbers, and underscores"
      );
    }

    return trimmedUsername;
  }

  /**
   * Validates email format
   *
   * @param email - Email address to validate
   * @returns Validated email
   * @throws Error if email is invalid
   */
  private validateEmail(email: string): string {
    if (!email || typeof email !== "string") {
      throw new Error("Email is required and must be a string");
    }

    const trimmedEmail = email.trim().toLowerCase();

    if (trimmedEmail.length === 0) {
      throw new Error("Email cannot be empty");
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      throw new Error("Invalid email format");
    }

    // Email length validation
    if (trimmedEmail.length > 255) {
      throw new Error("Email must be 255 characters or less");
    }

    return trimmedEmail;
  }

  /**
   * Validates name
   *
   * @param name - Name to validate
   * @returns Validated name
   * @throws Error if name is invalid
   */
  private validateName(name: string): string {
    if (!name || typeof name !== "string") {
      throw new Error("Name is required and must be a string");
    }

    const trimmedName = name.trim();

    if (trimmedName.length === 0) {
      throw new Error("Name cannot be empty");
    }

    if (trimmedName.length > 100) {
      throw new Error("Name must be 100 characters or less");
    }

    return trimmedName;
  }

  /**
   * Validates user role
   *
   * @param role - Role to validate
   * @returns Validated role
   * @throws Error if role is invalid
   */
  private validateRole(role: string): UserRole {
    const validRoles: UserRole[] = ["admin", "user", "viewer"];

    if (!validRoles.includes(role as UserRole)) {
      throw new Error(`Invalid role. Must be one of: ${validRoles.join(", ")}`);
    }

    return role as UserRole;
  }

  /**
   * Validates password hash format
   *
   * @param passwordHash - Password hash to validate
   * @returns Validated password hash
   * @throws Error if password hash is invalid
   */
  public static validatePasswordHash(passwordHash: string): string {
    if (!passwordHash || typeof passwordHash !== "string") {
      throw new Error("Password hash is required and must be a string");
    }

    if (passwordHash.length === 0) {
      throw new Error("Password hash cannot be empty");
    }

    // Bcrypt hashes typically start with $2a$, $2b$, or $2y$
    if (!passwordHash.startsWith("$2")) {
      throw new Error("Invalid password hash format");
    }

    return passwordHash;
  }

  /**
   * Checks if user has admin role
   *
   * @returns True if user is an admin
   */
  public isAdmin(): boolean {
    return this.role === "admin";
  }

  /**
   * Checks if user has viewer role
   *
   * @returns True if user is a viewer
   */
  public isViewer(): boolean {
    return this.role === "viewer";
  }

  /**
   * Checks if user has user role
   *
   * @returns True if user has user role
   */
  public isUser(): boolean {
    return this.role === "user";
  }

  /**
   * Checks if user can perform admin actions
   *
   * @returns True if user can perform admin actions
   */
  public canPerformAdminActions(): boolean {
    return this.role === "admin";
  }

  /**
   * Converts User domain entity to shared User interface
   * (excludes passwordHash for security)
   *
   * @returns User interface without password hash
   */
  public toSharedUser(): SharedUser {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      name: this.name,
      role: this.role,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastLoginAt: this.lastLoginAt,
    };
  }

  /**
   * Creates a User entity from database document
   *
   * @param doc - Database document (MongoDB document with _id)
   * @returns User domain entity
   */
  public static fromDatabaseDocument(doc: {
    _id: string | { toString(): string };
    username: string;
    email: string;
    passwordHash: string;
    name: string;
    role: UserRole;
    createdAt: Date | string;
    updatedAt: Date | string;
    lastLoginAt?: Date | string;
  }): User {
    // Convert ObjectId to string if needed
    const id = typeof doc._id === "string" ? doc._id : doc._id.toString();

    // Convert dates to ISO strings
    const createdAt =
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : doc.createdAt;
    const updatedAt =
      doc.updatedAt instanceof Date
        ? doc.updatedAt.toISOString()
        : doc.updatedAt;
    const lastLoginAt = doc.lastLoginAt
      ? doc.lastLoginAt instanceof Date
        ? doc.lastLoginAt.toISOString()
        : doc.lastLoginAt
      : undefined;

    return new User({
      id,
      username: doc.username,
      email: doc.email,
      passwordHash: doc.passwordHash,
      name: doc.name,
      role: doc.role,
      createdAt,
      updatedAt,
      lastLoginAt,
    });
  }

  /**
   * Creates a User entity from shared User interface and password hash
   *
   * @param sharedUser - Shared User interface
   * @param passwordHash - Password hash
   * @returns User domain entity
   */
  public static fromSharedUser(
    sharedUser: SharedUser,
    passwordHash: string
  ): User {
    return new User({
      id: sharedUser.id,
      username: sharedUser.username,
      email: sharedUser.email,
      passwordHash: User.validatePasswordHash(passwordHash),
      name: sharedUser.name,
      role: sharedUser.role,
      createdAt: sharedUser.createdAt,
      updatedAt: sharedUser.updatedAt,
      lastLoginAt: sharedUser.lastLoginAt,
    });
  }
}
