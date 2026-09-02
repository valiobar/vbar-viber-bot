/**
 * Auth application service
 *
 * Route → service → repository for login, logout, and token refresh.
 */

import { UserRepository } from "./UserRepository";
import { SessionRepository } from "./SessionRepository";
import type {
  LoginRequest,
  LoginResponse,
  LogoutRequest,
  LogoutResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
} from "./types";
import { comparePassword } from "@/lib/auth/password";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} from "@/lib/auth/jwt";
import { getJWTRefreshExpiresIn } from "@/lib/auth/config";

/**
 * Custom error class for authentication errors
 */
export class AuthenticationError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sessionRepository: SessionRepository
  ) {}

  /**
   * Authenticate a user and issue tokens
   *
   * @param request - Login request with username and password
   * @returns Promise resolving to login response with tokens and user data
   * @throws AuthenticationError with error code if authentication fails
   * @throws Error if login execution fails
   */
  async login(request: LoginRequest): Promise<LoginResponse> {
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

  /**
   * Invalidate a refresh token session
   *
   * @param request - Logout request with refresh token
   * @returns Promise resolving to logout response
   * @throws Error if logout fails
   */
  async logout(request: LogoutRequest): Promise<LogoutResponse> {
    // Validate input
    if (!request.refreshToken) {
      throw new Error("Refresh token is required");
    }

    try {
      // 1. Extract refresh token from request (already in request.refreshToken)
      const refreshToken = request.refreshToken;

      // 2. Delete session from database
      await this.sessionRepository.deleteByToken(refreshToken);

      // 3. Return success response
      // Note: We return success even if the token wasn't found
      // to prevent information leakage about token validity
      return {
        message: "Logout successful",
        success: true,
      };
    } catch (error) {
      throw new Error(
        `Logout failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Exchange a refresh token for a new access token (and rotate the refresh token)
   *
   * @param request - Refresh token request with refresh token
   * @returns Promise resolving to refresh token response with new tokens
   * @throws AuthenticationError with error code if refresh fails
   * @throws Error if refresh execution fails
   */
  async refresh(request: RefreshTokenRequest): Promise<RefreshTokenResponse> {
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
}
