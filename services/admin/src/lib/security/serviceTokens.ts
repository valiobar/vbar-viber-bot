/**
 * Service token security configuration for Admin Service
 *
 * Provides service token management and validation for service-to-service authentication.
 * This module follows the same pattern as the viber service security configuration.
 *
 * Uses Web Crypto API for Edge Runtime compatibility (Next.js middleware runs in Edge Runtime).
 */

// Type declaration for process.env in Edge Runtime (Next.js provides this at runtime)
declare const process: {
  env: Record<string, string | undefined>;
};

/**
 * Get configured service tokens from environment variables
 *
 * Service tokens are simple string tokens stored in environment variables.
 * Multiple service tokens can be configured for different services.
 *
 * Supported environment variables:
 * - SERVICE_TOKEN: Shared token accepted from any caller
 * - ADMIN_SERVICE_TOKEN: Token callers send when calling Admin (Viber uses this)
 * - VIBER_SERVICE_TOKEN: Alternate Viber token (also accepted)
 * - AI_SERVICE_TOKEN: AI service specific token
 *
 * @returns Array of valid service tokens (non-empty strings only)
 */
export function getServiceTokens(): string[] {
  const tokens: string[] = [];

  const add = (value: string | undefined): void => {
    const trimmed = value?.trim();
    if (trimmed) {
      tokens.push(trimmed);
    }
  };

  add(process.env.SERVICE_TOKEN);
  add(process.env.ADMIN_SERVICE_TOKEN);
  add(process.env.VIBER_SERVICE_TOKEN);
  add(process.env.AI_SERVICE_TOKEN);

  return tokens;
}

/**
 * Timing-safe string comparison using Web Crypto API
 *
 * This function performs constant-time comparison to prevent timing attacks.
 * Uses Web Crypto API for Edge Runtime compatibility.
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns true if strings are equal, false otherwise
 */
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  if (a.length !== b.length) {
    return false;
  }

  // Convert strings to ArrayBuffer for Web Crypto API
  const encoder = new TextEncoder();
  const aBuffer = encoder.encode(a);
  const bBuffer = encoder.encode(b);

  // Hash both strings and compare hashes (timing-safe)
  const aHash = await crypto.subtle.digest("SHA-256", aBuffer);
  const bHash = await crypto.subtle.digest("SHA-256", bBuffer);

  // Compare hash arrays (constant time)
  const aArray = new Uint8Array(aHash);
  const bArray = new Uint8Array(bHash);

  let result = 0;
  for (let i = 0; i < aArray.length; i++) {
    result |= aArray[i] ^ bArray[i];
  }

  return result === 0;
}

/**
 * Validate a service token against configured service tokens
 *
 * This function performs timing-safe comparison to prevent timing attacks.
 * It compares the provided token against all configured service tokens.
 *
 * Note: This is an async function because it uses Web Crypto API for Edge Runtime compatibility.
 *
 * @param token - The service token to validate
 * @returns Promise that resolves to true if the token is valid, false otherwise
 */
export async function validateServiceToken(token: string): Promise<boolean> {
  if (!token || token.trim().length === 0) {
    return false;
  }

  const validTokens = getServiceTokens();

  if (validTokens.length === 0) {
    // No tokens configured, validation fails
    return false;
  }

  const trimmedToken = token.trim();

  // Validate token against configured tokens using timing-safe comparison
  for (const validToken of validTokens) {
    if (await timingSafeEqual(trimmedToken, validToken)) {
      return true;
    }
  }

  return false;
}
