/**
 * JWT Authentication Middleware
 *
 * Middleware for Next.js API routes to authenticate requests using JWT tokens.
 * Extracts token from Authorization header, verifies it, and returns user information.
 *
 * @example
 * ```typescript
 * export async function GET(request: Request) {
 *   try {
 *     const user = await authenticate(request);
 *     // Use user.userId, user.email, user.role
 *   } catch (error) {
 *     return NextResponse.json(
 *       { error: { code: "AUTH_001", message: "Unauthorized" } },
 *       { status: 401 }
 *     );
 *   }
 * }
 * ```
 */

import { NextResponse } from "next/server";
import { verifyToken } from "../../../lib/jwt";
import type { JWTPayload } from "../../../lib/jwt";

/**
 * Authenticated user information
 *
 * Contains user information extracted from JWT token payload.
 */
export interface AuthenticatedUser {
  /**
   * User ID
   */
  userId: string;

  /**
   * User email address
   */
  email: string;

  /**
   * User role
   */
  role: "admin" | "user" | "viewer";
}

/**
 * Authentication error
 *
 * Custom error class for authentication failures.
 */
export class AuthenticationError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(
    message: string,
    code: string = "AUTH_001",
    statusCode: number = 401
  ) {
    super(message);
    this.name = "AuthenticationError";
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Authenticate request using JWT token
 *
 * Extracts JWT token from Authorization header, verifies it, and returns
 * authenticated user information.
 *
 * @param request - Next.js Request object
 * @returns Promise resolving to authenticated user information
 * @throws AuthenticationError if token is missing, invalid, or expired
 *
 * @example
 * ```typescript
 * const user = await authenticate(request);
 * console.log(user.userId, user.email, user.role);
 * ```
 */
export const authenticate = async (
  request: Request
): Promise<AuthenticatedUser> => {
  // Extract Authorization header
  const authHeader = request.headers.get("Authorization");

  if (!authHeader) {
    throw new AuthenticationError(
      "Authorization header is required",
      "AUTH_001",
      401
    );
  }

  // Check if header starts with "Bearer "
  if (!authHeader.startsWith("Bearer ")) {
    throw new AuthenticationError(
      "Authorization header must start with 'Bearer '",
      "AUTH_001",
      401
    );
  }

  // Extract token from header
  const token = authHeader.substring(7); // Remove "Bearer " prefix

  if (!token || token.length === 0) {
    throw new AuthenticationError("JWT token is required", "AUTH_001", 401);
  }

  try {
    // Verify token and get payload
    const payload: JWTPayload = await verifyToken(token);

    // Return authenticated user information
    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    };
  } catch (error) {
    // Handle token verification errors
    if (error instanceof Error) {
      // Check for specific error messages
      if (error.message.includes("expired")) {
        throw new AuthenticationError("Token has expired", "AUTH_002", 401);
      }

      if (
        error.message.includes("invalid") ||
        error.message.includes("verification failed")
      ) {
        throw new AuthenticationError(
          "Invalid or malformed token",
          "AUTH_003",
          401
        );
      }

      // Generic authentication error
      throw new AuthenticationError(
        `Authentication failed: ${error.message}`,
        "AUTH_001",
        401
      );
    }

    // Unknown error
    throw new AuthenticationError(
      "Authentication failed: Unknown error",
      "AUTH_001",
      401
    );
  }
};

/**
 * Create 401 Unauthorized response
 *
 * Helper function to create a standardized 401 response for authentication errors.
 *
 * @param error - AuthenticationError instance
 * @returns NextResponse with 401 status and error details
 */
export const createUnauthorizedResponse = (
  error: AuthenticationError
): NextResponse => {
  return NextResponse.json(
    {
      error: {
        code: error.code,
        message: error.message,
        timestamp: new Date().toISOString(),
      },
    },
    { status: error.statusCode }
  );
};
