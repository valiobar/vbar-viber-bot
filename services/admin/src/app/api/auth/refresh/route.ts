/**
 * Refresh Token API Route
 *
 * POST /api/auth/refresh
 *
 * Handles refresh token exchange by verifying the refresh token and returning new tokens.
 * This is an input adapter following Hexagonal Architecture principles.
 */

import { NextResponse } from "next/server";
import type { ApiResponse } from "@vbar/shared";
import { RefreshTokenUseCase } from "@/domains/user/application/use-cases/RefreshTokenUseCase";
import { MongoUserRepository } from "@/domains/user/adapters/out/repositories/UserRepository";
import { MongoSessionRepository } from "@/domains/user/adapters/out/repositories/SessionRepository";
import type {
  RefreshTokenRequest,
  RefreshTokenResponse,
} from "@/domains/user/ports/in/AuthPort";

/**
 * POST handler for refresh token endpoint
 *
 * @param request - Next.js Request object
 * @returns NextResponse with refresh token response or error
 */
export async function POST(
  request: Request
): Promise<NextResponse<ApiResponse<RefreshTokenResponse>>> {
  try {
    // Parse request body
    const body = await request.json();

    // Extract refresh token from request body
    let refreshToken: string | undefined;

    // First, try to get from request body
    if (body.refreshToken) {
      refreshToken = body.refreshToken;
    } else {
      // Fallback: try to extract from Authorization header
      const authHeader = request.headers.get("Authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        refreshToken = authHeader.substring(7);
      }
    }

    // Validate input
    if (!refreshToken) {
      return NextResponse.json<ApiResponse<RefreshTokenResponse>>(
        {
          error: {
            code: "AUTH_005",
            message: "Refresh token is required",
          },
        },
        { status: 400 }
      );
    }

    // Validate refresh token is not empty
    if (typeof refreshToken !== "string" || refreshToken.trim().length === 0) {
      return NextResponse.json<ApiResponse<RefreshTokenResponse>>(
        {
          error: {
            code: "AUTH_005",
            message: "Refresh token cannot be empty",
          },
        },
        { status: 400 }
      );
    }

    // Create refresh token request
    const refreshTokenRequest: RefreshTokenRequest = {
      refreshToken: refreshToken.trim(),
    };

    // Instantiate repositories
    const userRepository = new MongoUserRepository();
    const sessionRepository = new MongoSessionRepository();

    // Instantiate use case
    const refreshTokenUseCase = new RefreshTokenUseCase(
      userRepository,
      sessionRepository
    );

    // Execute refresh token use case
    const refreshTokenResponse = await refreshTokenUseCase.execute(
      refreshTokenRequest
    );

    // Return success response with new tokens
    return NextResponse.json<ApiResponse<RefreshTokenResponse>>(
      {
        data: refreshTokenResponse,
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle AuthenticationError from use case
    if (
      error instanceof Error &&
      error.name === "AuthenticationError" &&
      "code" in error
    ) {
      const statusCode =
        (error as { code: string }).code === "AUTH_004" ? 401 : 401;

      return NextResponse.json<ApiResponse<RefreshTokenResponse>>(
        {
          error: {
            code: (error as { code: string }).code || "AUTH_005",
            message: error.message || "Token refresh failed",
          },
        },
        { status: statusCode }
      );
    }

    // Handle other errors
    return NextResponse.json<ApiResponse<RefreshTokenResponse>>(
      {
        error: {
          code: "AUTH_005",
          message:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred during token refresh",
        },
      },
      { status: 500 }
    );
  }
}

