/**
 * Logout API Route
 *
 * POST /api/auth/logout
 *
 * Handles user logout by invalidating the refresh token session.
 * This is an input adapter following Hexagonal Architecture principles.
 */

import { NextResponse } from "next/server";
import type { ApiResponse } from "@vbar/shared";
import { LogoutUseCase } from "@/domains/user/application/use-cases/LogoutUseCase";
import { MongoSessionRepository } from "@/domains/user/adapters/out/repositories/SessionRepository";
import type {
  LogoutRequest,
  LogoutResponse,
} from "@/domains/user/ports/in/AuthPort";

/**
 * POST handler for logout endpoint
 *
 * @param request - Next.js Request object
 * @returns NextResponse with logout response or error
 */
export async function POST(
  request: Request
): Promise<NextResponse<ApiResponse<LogoutResponse>>> {
  try {
    // Parse request body
    const body = await request.json();

    // Extract refresh token from body or Authorization header
    let refreshToken: string | undefined;

    // First, try to get from request body
    if (body.refreshToken) {
      refreshToken = body.refreshToken;
    } else {
      // Fallback: try to extract from Authorization header
      const authHeader = request.headers.get("Authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        // For logout, we expect the refresh token in the body
        // But if it's in the Authorization header, we'll use it
        refreshToken = authHeader.substring(7);
      }
    }

    // Validate input
    if (!refreshToken) {
      return NextResponse.json<ApiResponse<LogoutResponse>>(
        {
          error: {
            code: "AUTH_001",
            message: "Refresh token is required",
          },
        },
        { status: 400 }
      );
    }

    // Validate refresh token is not empty
    if (typeof refreshToken !== "string" || refreshToken.trim().length === 0) {
      return NextResponse.json<ApiResponse<LogoutResponse>>(
        {
          error: {
            code: "AUTH_001",
            message: "Refresh token cannot be empty",
          },
        },
        { status: 400 }
      );
    }

    // Create logout request
    const logoutRequest: LogoutRequest = {
      refreshToken: refreshToken.trim(),
    };

    // Instantiate repository
    const sessionRepository = new MongoSessionRepository();

    // Instantiate use case
    const logoutUseCase = new LogoutUseCase(sessionRepository);

    // Execute logout use case
    const logoutResponse = await logoutUseCase.execute(logoutRequest);

    // Create response
    const response = NextResponse.json<ApiResponse<LogoutResponse>>(
      {
        data: logoutResponse,
      },
      { status: 200 }
    );

    // Clear access token cookie
    response.cookies.delete("accessToken");

    return response;
  } catch (error) {
    // Handle other errors
    return NextResponse.json<ApiResponse<LogoutResponse>>(
      {
        error: {
          code: "AUTH_001",
          message:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred during logout",
        },
      },
      { status: 500 }
    );
  }
}

