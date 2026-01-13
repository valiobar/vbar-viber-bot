/**
 * Next.js Middleware for Route Protection
 *
 * Protects routes by verifying JWT tokens from Authorization header or cookies,
 * or service tokens from X-Service-Token header for service-to-service communication.
 * Public routes (login, refresh, health) are allowed without authentication.
 * Protected API routes return 401 for unauthenticated requests.
 * Protected frontend routes redirect to login page.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "./domains/user/lib/jwt";
import { validateServiceToken } from "./lib/security/serviceTokens";

/**
 * Public routes that don't require authentication
 *
 * These routes are accessible without authentication:
 * - `/login` - Login page (frontend route, excluded from auth checks)
 * - `/api/auth/login` - Login API endpoint
 * - `/api/auth/refresh` - Token refresh endpoint
 * - `/api/health` - Health check endpoint
 */
const PUBLIC_ROUTES = [
  "/api/auth/login",
  "/api/auth/refresh",
  "/api/health",
  "/login", // Frontend login page - explicitly excluded from authentication
];

/**
 * Protected API routes that require authentication
 */
const PROTECTED_API_ROUTES = ["/api/users", "/api/config"];

/**
 * Check if a path matches any of the public routes
 *
 * @param pathname - Request pathname
 * @returns True if the path is a public route
 */
const isPublicRoute = (pathname: string): boolean => {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
};

/**
 * Check if a path matches any of the protected API routes
 *
 * @param pathname - Request pathname
 * @returns True if the path is a protected API route
 */
const isProtectedApiRoute = (pathname: string): boolean => {
  return PROTECTED_API_ROUTES.some((route) => pathname.startsWith(route));
};

/**
 * Extract service token from request
 *
 * Extracts service token from X-Service-Token header (case-insensitive).
 *
 * @param request - Next.js request object
 * @returns Service token or null if not found
 */
const extractServiceToken = (request: NextRequest): string | null => {
  const serviceToken = request.headers.get("x-service-token");
  if (serviceToken && serviceToken.trim().length > 0) {
    return serviceToken.trim();
  }
  return null;
};

/**
 * Extract JWT token from request
 *
 * Tries to extract token from:
 * 1. Authorization header (Bearer token)
 * 2. Cookie (accessToken)
 *
 * @param request - Next.js request object
 * @returns JWT token or null if not found
 */
const extractToken = (request: NextRequest): string | null => {
  // Try Authorization header first
  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7); // Remove "Bearer " prefix
    if (token && token.length > 0) {
      return token;
    }
  }

  // Try cookie as fallback
  const cookieToken = request.cookies.get("accessToken")?.value;
  if (cookieToken && cookieToken.length > 0) {
    return cookieToken;
  }

  return null;
};

/**
 * Verify JWT token and return user information
 *
 * @param token - JWT token to verify
 * @returns User information from token payload
 * @throws Error if token is invalid or expired
 */
const verifyAuthToken = async (token: string) => {
  try {
    const payload = await verifyToken(token);
    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    };
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Token verification failed"
    );
  }
};

/**
 * Create 401 Unauthorized response for API routes
 *
 * @param message - Error message
 * @returns NextResponse with 401 status
 */
const createUnauthorizedResponse = (message: string): NextResponse => {
  return NextResponse.json(
    {
      error: {
        code: "AUTH_001",
        message,
        timestamp: new Date().toISOString(),
      },
    },
    { status: 401 }
  );
};

/**
 * Next.js Middleware
 *
 * Protects routes by verifying JWT tokens. Public routes are allowed without authentication.
 * Protected API routes return 401 for unauthenticated requests.
 * Protected frontend routes redirect to login page.
 *
 * @param request - Next.js request object
 * @returns NextResponse or null to continue
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes without authentication
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // For protected routes, verify authentication
  if (isProtectedApiRoute(pathname) || pathname.startsWith("/api/")) {
    // Check for service token first (for service-to-service communication)
    const serviceToken = extractServiceToken(request);
    if (serviceToken) {
      // Validate service token (async - uses Web Crypto API for Edge Runtime compatibility)
      const isValidServiceToken = await validateServiceToken(serviceToken);
      if (isValidServiceToken) {
        // Service token is valid, allow request to proceed
        // Optionally log service name for monitoring
        const serviceName = request.headers.get("x-service-name");
        if (serviceName) {
          console.log(`Service authenticated: ${serviceName}`);
        }
        return NextResponse.next();
      } else {
        // Invalid service token
        return createUnauthorizedResponse("Invalid service token");
      }
    }

    // If no service token, check for JWT token (for admin UI users)
    const token = extractToken(request);
    if (!token) {
      return createUnauthorizedResponse("Authentication required");
    }

    try {
      // Verify JWT token
      await verifyAuthToken(token);

      // Token is valid, allow request to proceed
      return NextResponse.next();
    } catch (error) {
      // Token is invalid or expired
      const errorMessage =
        error instanceof Error ? error.message : "Authentication failed";

      // Check if it's an expired token
      if (errorMessage.includes("expired")) {
        return createUnauthorizedResponse("Token has expired");
      }

      // Check if it's an invalid token
      if (
        errorMessage.includes("invalid") ||
        errorMessage.includes("verification failed")
      ) {
        return createUnauthorizedResponse("Invalid or malformed token");
      }

      // Generic authentication error
      return createUnauthorizedResponse("Authentication failed");
    }
  }

  // For frontend routes (non-API), check authentication and redirect if needed
  // This handles all frontend routes like `/`, `/dashboard`, etc.
  const token = extractToken(request);

  if (!token) {
    // Redirect to login page for unauthenticated users
    // Preserve intended destination via redirect query parameter
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    // Verify token for frontend routes
    await verifyAuthToken(token);
    // Token is valid, allow request to proceed
    return NextResponse.next();
  } catch (error) {
    // Redirect to login page if token is invalid or expired
    // Preserve intended destination via redirect query parameter
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

/**
 * Middleware configuration
 *
 * Specifies which routes the middleware should run on.
 * Using matcher to optimize performance by only running middleware on specific routes.
 *
 * The matcher includes:
 * - All frontend routes (e.g., `/`, `/login`, `/dashboard`) - for redirect logic
 * - All API routes (e.g., `/api/auth/login`, `/api/users`) - for authentication checks
 *
 * The matcher excludes:
 * - _next/static (static files)
 * - _next/image (image optimization files)
 * - favicon.ico (favicon file)
 * - public files (files in public folder with image extensions)
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (files in public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
