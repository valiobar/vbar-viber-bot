/**
 * Security configuration for Web3 Service
 *
 * Provides security-related configuration helpers including:
 * - Service token management (uses web3Config)
 * - Service token validation
 */

import crypto from "crypto";
import { getServiceTokens as getServiceTokensFromConfig } from "./web3Config";

/**
 * Get configured service tokens from web3Config
 * 
 * This function uses getServiceTokens from web3Config to get all service tokens.
 * 
 * @returns Array of valid service tokens (non-empty strings only)
 */
export function getServiceTokens(): string[] {
  return getServiceTokensFromConfig();
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

