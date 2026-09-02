/**
 * Authentication configuration helper for JWT settings
 *
 * Provides configuration for JWT token generation and verification
 */

import { ConfigHelper } from "@vbar/shared";

/**
 * JWT configuration interface
 */
export interface JWTConfig {
  secret: string;
  expiresIn: string;
  refreshExpiresIn: string;
}

/**
 * Get JWT configuration from environment variables
 *
 * Environment Variables:
 * - JWT_SECRET: Secret key for signing JWT tokens (required)
 * - JWT_EXPIRES_IN: Token expiration time (default: "7d")
 * - JWT_REFRESH_EXPIRES_IN: Refresh token expiration time (default: "30d")
 *
 * @returns JWT configuration object
 * @throws Error if JWT_SECRET is not set
 */
export function getJWTConfig(): JWTConfig {
  const secret = ConfigHelper.getEnv("JWT_SECRET");

  // Validate secret length (minimum 32 characters for security)
  if (secret.length < 32) {
    throw new Error(
      "JWT_SECRET must be at least 32 characters long for security"
    );
  }

  const expiresIn = ConfigHelper.getEnv("JWT_EXPIRES_IN", "7d");
  const refreshExpiresIn = ConfigHelper.getEnv("JWT_REFRESH_EXPIRES_IN", "30d");

  return {
    secret,
    expiresIn,
    refreshExpiresIn,
  };
}

/**
 * Get JWT secret key
 *
 * @returns JWT secret string
 */
export function getJWTSecret(): string {
  return getJWTConfig().secret;
}

/**
 * Get JWT access token expiration time
 *
 * @returns Expiration time string (e.g., "7d", "1h", "30m")
 */
export function getJWTExpiresIn(): string {
  return getJWTConfig().expiresIn;
}

/**
 * Get JWT refresh token expiration time
 *
 * @returns Expiration time string (e.g., "30d", "7d", "1h")
 */
export function getJWTRefreshExpiresIn(): string {
  return getJWTConfig().refreshExpiresIn;
}
