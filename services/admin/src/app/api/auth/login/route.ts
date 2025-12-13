/**
 * Login API Route
 *
 * POST /api/auth/login
 *
 * Handles user authentication by verifying credentials and returning JWT tokens.
 * This is an input adapter following Hexagonal Architecture principles.
 */

import { NextResponse } from "next/server";
import type { ApiResponse } from "@vbar/shared";
import { LoginUseCase } from "@/domains/user/application/use-cases/LoginUseCase";
import { MongoUserRepository } from "@/domains/user/adapters/out/repositories/UserRepository";
import { MongoSessionRepository } from "@/domains/user/adapters/out/repositories/SessionRepository";
import type {
  LoginRequest,
  LoginResponse,
} from "@/domains/user/ports/in/AuthPort";

/**
 * POST handler for login endpoint
 *
 * @param request - Next.js Request object
 * @returns NextResponse with login response or error
 */
export async function POST(
  request: Request
): Promise<NextResponse<ApiResponse<LoginResponse>>> {
  try {
    // Parse request body
    const body = await request.json();

    // Validate input
    if (!body.username || !body.password) {
      return NextResponse.json<ApiResponse<LoginResponse>>(
        {
          error: {
            code: "AUTH_001",
            message: "Username and password are required",
          },
        },
        { status: 400 }
      );
    }

    // Validate username format
    const trimmedUsername = body.username.trim().toLowerCase();
    if (trimmedUsername.length === 0) {
      return NextResponse.json<ApiResponse<LoginResponse>>(
        {
          error: {
            code: "AUTH_001",
            message: "Username cannot be empty",
          },
        },
        { status: 400 }
      );
    }

    if (trimmedUsername.length < 3) {
      return NextResponse.json<ApiResponse<LoginResponse>>(
        {
          error: {
            code: "AUTH_001",
            message: "Username must be at least 3 characters long",
          },
        },
        { status: 400 }
      );
    }

    if (trimmedUsername.length > 50) {
      return NextResponse.json<ApiResponse<LoginResponse>>(
        {
          error: {
            code: "AUTH_001",
            message: "Username must be 50 characters or less",
          },
        },
        { status: 400 }
      );
    }

    // Only allow lowercase letters, numbers, and underscores
    const usernameRegex = /^[a-z0-9_]+$/;
    if (!usernameRegex.test(trimmedUsername)) {
      return NextResponse.json<ApiResponse<LoginResponse>>(
        {
          error: {
            code: "AUTH_001",
            message:
              "Username can only contain lowercase letters, numbers, and underscores",
          },
        },
        { status: 400 }
      );
    }

    // Validate password is not empty
    if (
      typeof body.password !== "string" ||
      body.password.trim().length === 0
    ) {
      return NextResponse.json<ApiResponse<LoginResponse>>(
        {
          error: {
            code: "AUTH_001",
            message: "Password is required",
          },
        },
        { status: 400 }
      );
    }

    // Create login request
    const loginRequest: LoginRequest = {
      username: trimmedUsername,
      password: body.password,
    };

    // Instantiate repositories
    const userRepository = new MongoUserRepository();
    const sessionRepository = new MongoSessionRepository();

    // Instantiate use case
    const loginUseCase = new LoginUseCase(userRepository, sessionRepository);

    // Execute login use case
    const loginResponse = await loginUseCase.execute(loginRequest);

    // Create response with tokens and user data
    const response = NextResponse.json<ApiResponse<LoginResponse>>(
      {
        data: loginResponse,
      },
      { status: 200 }
    );

    // Set access token in HTTP-only cookie for middleware authentication
    // The cookie is accessible to server-side middleware but not to client-side JavaScript
    // This allows the middleware to verify authentication on protected routes
    if (loginResponse.accessToken) {
      response.cookies.set("accessToken", loginResponse.accessToken, {
        httpOnly: true, // Prevents JavaScript access (XSS protection)
        secure: process.env.NODE_ENV === "production", // HTTPS only in production
        sameSite: "lax", // CSRF protection
        maxAge: 60 * 60 * 24, // 24 hours (matches token expiration)
        path: "/", // Available for all routes
      });
    }

    return response;
  } catch (error) {
    // Handle AuthenticationError from use case
    if (
      error instanceof Error &&
      error.name === "AuthenticationError" &&
      "code" in error
    ) {
      return NextResponse.json<ApiResponse<LoginResponse>>(
        {
          error: {
            code: (error as { code: string }).code || "AUTH_001",
            message: error.message || "Authentication failed",
          },
        },
        { status: 401 }
      );
    }

    // Handle other errors
    return NextResponse.json<ApiResponse<LoginResponse>>(
      {
        error: {
          code: "AUTH_001",
          message:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred during login",
        },
      },
      { status: 500 }
    );
  }
}
