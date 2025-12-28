/**
 * Logout Use Case
 *
 * Handles user logout by invalidating the refresh token session.
 * This is an application layer use case following Hexagonal Architecture principles.
 */

import type { SessionRepository } from "../../ports/out/SessionRepository";
import type { LogoutRequest, LogoutResponse } from "../../ports/in/AuthPort";

/**
 * Logout Use Case
 *
 * Handles user logout by:
 * 1. Extracting refresh token from request
 * 2. Deleting session from database
 * 3. Returning success response
 */
export class LogoutUseCase {
  /**
   * Creates a new LogoutUseCase instance
   *
   * @param sessionRepository - Session repository for session management
   */
  constructor(private readonly sessionRepository: SessionRepository) {}

  /**
   * Execute logout use case
   *
   * @param request - Logout request with refresh token
   * @returns Promise resolving to logout response
   * @throws Error if logout fails
   */
  async execute(request: LogoutRequest): Promise<LogoutResponse> {
    // Validate input
    if (!request.refreshToken) {
      throw new Error("Refresh token is required");
    }

    try {
      // 1. Extract refresh token from request (already in request.refreshToken)
      const refreshToken = request.refreshToken;

      // 2. Delete session from database
      const deleted = await this.sessionRepository.deleteByToken(refreshToken);

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
}

