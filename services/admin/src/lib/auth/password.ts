/**
 * Password hashing utilities using bcrypt
 *
 * Provides functions for hashing passwords and comparing passwords
 * with their hashed versions for authentication purposes.
 */

import bcrypt from "bcrypt";

/**
 * Default number of salt rounds for bcrypt hashing
 * Higher values increase security but also computation time
 */
const DEFAULT_SALT_ROUNDS = 10;

/**
 * Hash a plain text password using bcrypt
 *
 * @param password - Plain text password to hash
 * @param saltRounds - Number of salt rounds (default: 10)
 * @returns Promise resolving to the hashed password
 * @throws Error if hashing fails
 *
 * @example
 * ```typescript
 * const hashedPassword = await hashPassword("mySecurePassword");
 * ```
 */
export async function hashPassword(
  password: string,
  saltRounds: number = DEFAULT_SALT_ROUNDS
): Promise<string> {
  if (!password || password.length === 0) {
    throw new Error("Password cannot be empty");
  }

  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
  } catch (error) {
    throw new Error(
      `Failed to hash password: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Compare a plain text password with a hashed password
 *
 * Uses bcrypt's timing-safe comparison to prevent timing attacks.
 *
 * @param password - Plain text password to verify
 * @param hashedPassword - Hashed password to compare against
 * @returns Promise resolving to true if passwords match, false otherwise
 * @throws Error if comparison fails
 *
 * @example
 * ```typescript
 * const isValid = await comparePassword("myPassword", storedHash);
 * if (isValid) {
 *   // Password is correct
 * }
 * ```
 */
export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  if (!password || password.length === 0) {
    return false;
  }

  if (!hashedPassword || hashedPassword.length === 0) {
    return false;
  }

  try {
    const isMatch = await bcrypt.compare(password, hashedPassword);
    return isMatch;
  } catch (error) {
    throw new Error(
      `Failed to compare password: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

