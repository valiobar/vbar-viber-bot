/**
 * Refresh Token Use Case
 *
 * Handles refresh token exchange by verifying the refresh token,
 * generating a new access token, and optionally rotating the refresh token.
 * This is an application layer use case following Hexagonal Architecture principles.
 */

import type { UserRepository } from "../../ports/out/UserRepository";
import type { SessionRepository } from "../../ports/out/SessionRepository";
import type {
  RefreshTokenRequest,
  RefreshTokenResponse,
} from "../../ports/in/AuthPort";
import {
  verifyToken,
  generateAccessToken,
  generateRefreshToken,
} from "../../lib/jwt";
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
 * Refresh Token Use Case
 *
 * Handles refresh token exchange by:
 * 1. Verifying refresh token
 * 2. Finding session in database
 * 3. Verifying session is valid and not expired
 * 4. Finding user by userId
 * 5. Generating new access token
 * 6. Optionally rotating refresh token
 * 7. Returning new tokens
 */
export class RefreshTokenUseCase {
  /**
   * Creates a new RefreshTokenUseCase instance
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
   * Execute refresh token use case
   *
   * @param request - Refresh token request with refresh token
   * @returns Promise resolving to refresh token response with new tokens
   * @throws AuthenticationError with error code if refresh fails
   * @throws Error if use case execution fails
   */
  async execute(request: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    // Validate input
    if (!request.refreshToken) {
      throw new AuthenticationError("Refresh token is required", "AUTH_005");
    }

    try {
      // 1. Verify refresh token
      let payload;
      try {
        payload = await verifyToken(request.refreshToken);
      } catch (error) {
        if (
          error instanceof Error &&
          (error.message.includes("expired") ||
            error.message.includes("Token has expired"))
        ) {
          throw new AuthenticationError("Token expired", "AUTH_004");
        }
        throw new AuthenticationError("Token invalid", "AUTH_005");
      }

      // 2. Find session in database
      const session = await this.sessionRepository.findByToken(
        request.refreshToken
      );

      if (!session) {
        throw new AuthenticationError("Token invalid", "AUTH_005");
      }

      // 3. Verify session is valid and not expired
      if (session.expiresAt < new Date()) {
        // Session is expired, delete it
        await this.sessionRepository.deleteByToken(request.refreshToken);
        throw new AuthenticationError("Token expired", "AUTH_004");
      }

      // 4. Find user by userId
      const user = await this.userRepository.findById(payload.userId);

      if (!user) {
        // User not found, delete session
        await this.sessionRepository.deleteByToken(request.refreshToken);
        throw new AuthenticationError("Token invalid", "AUTH_005");
      }

      // 5. Generate new access token
      const accessToken = await generateAccessToken(
        user.id,
        user.email,
        user.role
      );

      // 6. Optionally rotate refresh token (for security, we'll rotate it)
      // Delete old session
      await this.sessionRepository.deleteByToken(request.refreshToken);

      // Generate new refresh token
      const newRefreshToken = await generateRefreshToken(
        user.id,
        user.email,
        user.role
      );

      // Store new refresh token
      const refreshExpiresIn = getJWTRefreshExpiresIn();
      const expiresAt = this.parseExpiration(refreshExpiresIn);

      await this.sessionRepository.create({
        userId: user.id,
        refreshToken: newRefreshToken,
        expiresAt,
      });

      // 7. Return new tokens
      return {
        accessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      // Re-throw AuthenticationError as-is
      if (error instanceof AuthenticationError) {
        throw error;
      }

      // Wrap other errors
      throw new Error(
        `Refresh token failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}
