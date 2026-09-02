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
import { AuthService } from "@/domains/user/AuthService";
import { UserRepository } from "@/domains/user/UserRepository";
import { SessionRepository } from "@/domains/user/SessionRepository";
import type {
  RefreshTokenRequest,
  RefreshTokenResponse,
} from "@/domains/user/types";

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

    const authService = new AuthService(
      new UserRepository(),
      new SessionRepository()
    );

    const refreshTokenResponse = await authService.refresh(refreshTokenRequest);

    // Return response with new tokens
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
