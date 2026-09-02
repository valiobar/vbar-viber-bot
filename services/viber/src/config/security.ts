/**
 * Security configuration for Viber Service
 *
 * Provides security-related configuration helpers including:
 * - Service token management
 * - Rate limit configuration
 * - Service token validation
 */

import { ConfigHelper } from "@vbar/shared";
import crypto from "crypto";

/**
 * Rate limit configuration interface
 */
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  healthMax: number;
  webhookMax: number;
  serviceMax: number;
}

/**
 * Get configured service tokens from environment variables
 *
 * Service tokens are simple string tokens stored in environment variables.
 * Multiple service tokens can be configured for different services.
 *
 * Supported environment variables:
 * - SERVICE_TOKEN: General service token
 * - ADMIN_SERVICE_TOKEN: Admin service specific token
 * - AI_SERVICE_TOKEN: AI service specific token
 *
 * @returns Array of valid service tokens (non-empty strings only)
 */
export function getServiceTokens(): string[] {
  const tokens: string[] = [];

  // Get general service token
  const serviceToken = process.env.SERVICE_TOKEN;
  if (serviceToken && serviceToken.trim().length > 0) {
    tokens.push(serviceToken.trim());
  }

  // Get admin service token
  const adminServiceToken = process.env.ADMIN_SERVICE_TOKEN;
  if (adminServiceToken && adminServiceToken.trim().length > 0) {
    tokens.push(adminServiceToken.trim());
  }

  // Get AI service token
  const aiServiceToken = process.env.AI_SERVICE_TOKEN;
  if (aiServiceToken && aiServiceToken.trim().length > 0) {
    tokens.push(aiServiceToken.trim());
  }

  return tokens;
}

/**
 * Get rate limit configuration from environment variables
 *
 * Configuration values with defaults:
 * - RATE_LIMIT_WINDOW_MS: Time window in milliseconds (default: 60000 = 1 minute)
 * - RATE_LIMIT_MAX_REQUESTS: Maximum requests per window for general routes (default: 100)
 * - RATE_LIMIT_HEALTH_MAX: Maximum requests per window for health checks (default: 10)
 * - RATE_LIMIT_WEBHOOK_MAX: Maximum requests per window for webhooks (default: 1000)
 * - RATE_LIMIT_SERVICE_MAX: Maximum requests per window for service-to-service routes (default: 5000)
 *
 * @returns Rate limit configuration object
 */
export function getRateLimitConfig(): RateLimitConfig {
  const windowMs = ConfigHelper.getEnvNumber("RATE_LIMIT_WINDOW_MS", 60000); // Default: 1 minute
  const maxRequests = ConfigHelper.getEnvNumber("RATE_LIMIT_MAX_REQUESTS", 100); // Default: 100 requests/min
  const healthMax = ConfigHelper.getEnvNumber("RATE_LIMIT_HEALTH_MAX", 10); // Default: 10 requests/min
  const webhookMax = ConfigHelper.getEnvNumber("RATE_LIMIT_WEBHOOK_MAX", 1000); // Default: 1000 requests/min
  const serviceMax = ConfigHelper.getEnvNumber("RATE_LIMIT_SERVICE_MAX", 5000); // Default: 5000 requests/min

  return {
    windowMs,
    maxRequests,
    healthMax,
    webhookMax,
    serviceMax,
  };
}

/**
 * Validate a service token against configured service tokens
 *
 * This function performs timing-safe comparison to prevent timing attacks.
 * It compares the provided token against all configured service tokens.
 *
 * @param token - The service token to validate
 * @returns true if the token is valid, false otherwise
 */
export function validateServiceToken(token: string): boolean {
  if (!token || token.trim().length === 0) {
    return false;
  }

  const validTokens = getServiceTokens();

  if (validTokens.length === 0) {
    // No tokens configured, validation fails
    return false;
  }

  const tokenBuffer = Buffer.from(token.trim(), "utf8");

  // Validate token against configured tokens using timing-safe comparison
  for (const validToken of validTokens) {
    const validTokenBuffer = Buffer.from(validToken, "utf8");

    // Ensure buffers are the same length (timingSafeEqual requires equal length)
    if (tokenBuffer.length !== validTokenBuffer.length) {
      continue;
    }

    // Use timing-safe comparison to prevent timing attacks
    if (crypto.timingSafeEqual(tokenBuffer, validTokenBuffer)) {
      return true;
    }
  }

  return false;
}
