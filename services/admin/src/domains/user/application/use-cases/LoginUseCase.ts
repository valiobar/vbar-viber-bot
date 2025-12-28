/**
 * Login Use Case
 *
 * Handles user authentication by verifying credentials,
 * generating JWT tokens, and creating a session.
 * This is an application layer use case following Hexagonal Architecture principles.
 */

import type { UserRepository } from "../../ports/out/UserRepository";
import type { SessionRepository } from "../../ports/out/SessionRepository";
import type { LoginRequest, LoginResponse } from "../../ports/in/AuthPort";
import { comparePassword } from "../../lib/password";
import { generateAccessToken, generateRefreshToken } from "../../lib/jwt";
import { getJWTRefreshExpiresIn } from "../../lib/auth";

/**
 * Custom error class for authentication errors
 */
export class AuthenticationError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

/**
 * Login Use Case
 *
 * Handles user login by:
 * 1. Finding user by username
 * 2. Verifying password
 * 3. Updating lastLoginAt
 * 4. Generating access token
 * 5. Generating refresh token
 * 6. Storing refresh token in database
 * 7. Returning tokens and user data
 */
export class LoginUseCase {
  /**
   * Creates a new LoginUseCase instance
   *
   * @param userRepository - User repository for user data operations
   * @param sessionRepository - Session repository for session management
   */
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sessionRepository: SessionRepository
  ) {}

  /**
   * Parse expiration string (e.g., "30d", "7d", "1h") and return Date
   *
   * @param expiresIn - Expiration string (e.g., "30d", "7d", "1h", "30m")
   * @returns Date object representing expiration time
   */
  private parseExpiration(expiresIn: string): Date {
    const now = new Date();
    const match = expiresIn.match(/^(\d+)([dhms])$/);

    if (!match) {
      // Default to 30 days if format is invalid
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case "d":
        return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
      case "h":
        return new Date(now.getTime() + value * 60 * 60 * 1000);
      case "m":
        return new Date(now.getTime() + value * 60 * 1000);
      case "s":
        return new Date(now.getTime() + value * 1000);
      default:
        // Default to 30 days
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Execute login use case
   *
   * @param request - Login request with username and password
   * @returns Promise resolving to login response with tokens and user data
   * @throws AuthenticationError with error code if authentication fails
   * @throws Error if use case execution fails
   */
  async execute(request: LoginRequest): Promise<LoginResponse> {
    // Validate input
    if (!request.username || !request.password) {
      throw new AuthenticationError(
        "Username and password are required",
        "AUTH_001"
      );
    }

    try {
      // 1. Find user by username
      const user = await this.userRepository.findByUsername(request.username);

      if (!user) {
        throw new AuthenticationError("Invalid credentials", "AUTH_001");
      }

      // 2. Verify password
      const isPasswordValid = await comparePassword(
        request.password,
        user.passwordHash
      );

      if (!isPasswordValid) {
        throw new AuthenticationError("Invalid credentials", "AUTH_001");
      }

      // 3. Update lastLoginAt
      const now = new Date().toISOString();
      const updatedUser = await this.userRepository.update(user.id, {
        lastLoginAt: now,
      });

      // 4. Generate access token
      const accessToken = await generateAccessToken(
        updatedUser.id,
        updatedUser.email,
        updatedUser.role
      );

      // 5. Generate refresh token
      const refreshToken = await generateRefreshToken(
        updatedUser.id,
        updatedUser.email,
        updatedUser.role
      );

      // 6. Store refresh token in database
      const refreshExpiresIn = getJWTRefreshExpiresIn();
      const expiresAt = this.parseExpiration(refreshExpiresIn);

      await this.sessionRepository.create({
        userId: updatedUser.id,
        refreshToken,
        expiresAt,
      });

      // 7. Return tokens and user data
      return {
        accessToken,
        refreshToken,
        user: updatedUser.toSharedUser(),
      };
    } catch (error) {
      // Re-throw AuthenticationError as-is
      if (error instanceof AuthenticationError) {
        throw error;
      }

      // Wrap other errors
      throw new Error(
        `Login failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}
