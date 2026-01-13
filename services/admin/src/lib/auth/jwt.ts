/**
 * JWT token generation and verification utilities using jose library
 *
 * Provides functions for generating access tokens, refresh tokens,
 * verifying tokens, and decoding token payloads.
 */

import { SignJWT, jwtVerify, decodeJwt } from "jose";
import { getJWTSecret, getJWTExpiresIn, getJWTRefreshExpiresIn } from "../../config/auth";

/**
 * JWT payload structure
 */
export interface JWTPayload {
  userId: string;
  email: string;
  role: "admin" | "user" | "viewer";
  iat: number;
  exp: number;
}

/**
 * Generate a JWT access token
 *
 * @param userId - User ID
 * @param email - User email
 * @param role - User role
 * @returns Promise resolving to the signed JWT access token
 * @throws Error if token generation fails
 *
 * @example
 * ```typescript
 * const token = await generateAccessToken("user123", "user@example.com", "admin");
 * ```
 */
export async function generateAccessToken(
  userId: string,
  email: string,
  role: "admin" | "user" | "viewer"
): Promise<string> {
  if (!userId || !email || !role) {
    throw new Error("userId, email, and role are required");
  }

  try {
    const secret = getJWTSecret();
    const expiresIn = getJWTExpiresIn();

    // Convert secret to Uint8Array for jose library
    const secretKey = new TextEncoder().encode(secret);

    const token = await new SignJWT({
      userId,
      email,
      role,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(secretKey);

    return token;
  } catch (error) {
    throw new Error(
      `Failed to generate access token: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Generate a JWT refresh token
 *
 * @param userId - User ID
 * @param email - User email
 * @param role - User role
 * @returns Promise resolving to the signed JWT refresh token
 * @throws Error if token generation fails
 *
 * @example
 * ```typescript
 * const refreshToken = await generateRefreshToken("user123", "user@example.com", "admin");
 * ```
 */
export async function generateRefreshToken(
  userId: string,
  email: string,
  role: "admin" | "user" | "viewer"
): Promise<string> {
  if (!userId || !email || !role) {
    throw new Error("userId, email, and role are required");
  }

  try {
    const secret = getJWTSecret();
    const expiresIn = getJWTRefreshExpiresIn();

    // Convert secret to Uint8Array for jose library
    const secretKey = new TextEncoder().encode(secret);

    const token = await new SignJWT({
      userId,
      email,
      role,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(secretKey);

    return token;
  } catch (error) {
    throw new Error(
      `Failed to generate refresh token: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Verify and decode a JWT token
 *
 * @param token - JWT token to verify
 * @returns Promise resolving to the decoded JWT payload
 * @throws Error if token is invalid, expired, or verification fails
 *
 * @example
 * ```typescript
 * try {
 *   const payload = await verifyToken(token);
 *   console.log(payload.userId, payload.email);
 * } catch (error) {
 *   // Token is invalid or expired
 * }
 * ```
 */
export async function verifyToken(token: string): Promise<JWTPayload> {
  if (!token || token.length === 0) {
    throw new Error("Token is required");
  }

  try {
    const secret = getJWTSecret();
    const secretKey = new TextEncoder().encode(secret);

    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });

    // Validate payload structure
    if (
      !payload.userId ||
      !payload.email ||
      !payload.role ||
      typeof payload.userId !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.role !== "string"
    ) {
      throw new Error("Invalid token payload structure");
    }

    // Validate role
    if (!["admin", "user", "viewer"].includes(payload.role as string)) {
      throw new Error("Invalid role in token payload");
    }

    // Ensure iat and exp are numbers
    const iat = typeof payload.iat === "number" ? payload.iat : Math.floor(Date.now() / 1000);
    const exp = typeof payload.exp === "number" ? payload.exp : 0;

    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as "admin" | "user" | "viewer",
      iat,
      exp,
    };
  } catch (error) {
    if (error instanceof Error) {
      // Provide more specific error messages
      if (error.message.includes("expired")) {
        throw new Error("Token has expired");
      }
      if (error.message.includes("invalid")) {
        throw new Error("Token is invalid");
      }
      throw new Error(`Token verification failed: ${error.message}`);
    }
    throw new Error("Token verification failed: Unknown error");
  }
}

/**
 * Decode a JWT token without verification
 *
 * WARNING: This function does not verify the token signature.
 * Use verifyToken() for secure token validation.
 *
 * @param token - JWT token to decode
 * @returns Decoded JWT payload (not verified)
 * @throws Error if token cannot be decoded
 *
 * @example
 * ```typescript
 * const payload = decodeToken(token);
 * console.log(payload.userId);
 * ```
 */
export function decodeToken(token: string): JWTPayload {
  if (!token || token.length === 0) {
    throw new Error("Token is required");
  }

  try {
    const decoded = decodeJwt(token);

    // Validate payload structure
    if (
      !decoded.userId ||
      !decoded.email ||
      !decoded.role ||
      typeof decoded.userId !== "string" ||
      typeof decoded.email !== "string" ||
      typeof decoded.role !== "string"
    ) {
      throw new Error("Invalid token payload structure");
    }

    // Validate role
    if (!["admin", "user", "viewer"].includes(decoded.role as string)) {
      throw new Error("Invalid role in token payload");
    }

    // Ensure iat and exp are numbers
    const iat = typeof decoded.iat === "number" ? decoded.iat : Math.floor(Date.now() / 1000);
    const exp = typeof decoded.exp === "number" ? decoded.exp : 0;

    return {
      userId: decoded.userId as string,
      email: decoded.email as string,
      role: decoded.role as "admin" | "user" | "viewer",
      iat,
      exp,
    };
  } catch (error) {
    throw new Error(
      `Failed to decode token: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}








