/**
 * Web3 Service configuration
 *
 * Provides service-specific configuration including encryption keys,
 * service tokens, feature flags, and rate limiting settings
 */

import { ConfigHelper } from "@vbar/shared";

/**
 * Web3 Service configuration interface
 */
export interface Web3ServiceConfig {
  encryptionKey: string;
  serviceTokens: string[];
  featureFlags: {
    enableWalletCreation: boolean;
    enableTransactionSigning: boolean;
    enableContractInteraction: boolean;
    enableNFTOperations: boolean;
  };
  rateLimiting: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
}

/**
 * Get encryption key from environment
 * Used for encrypting sensitive data like private keys
 *
 * @returns Encryption key
 */
export function getEncryptionKey(): string {
  const key = ConfigHelper.getEnv("WEB3_ENCRYPTION_KEY");
  if (!key || key.length < 32) {
    throw new Error(
      "WEB3_ENCRYPTION_KEY must be set and at least 32 characters long"
    );
  }
  return key;
}

/**
 * Get service tokens configuration
 * Service tokens are used for service-to-service authentication
 *
 * Supports multiple service tokens from environment variables:
 * - SERVICE_TOKEN: General service token
 * - ADMIN_SERVICE_TOKEN: Admin service specific token
 * - VIBER_SERVICE_TOKEN: Viber service specific token
 * - AI_SERVICE_TOKEN: AI service specific token
 * - ANALYTICS_SERVICE_TOKEN: Analytics service specific token
 * - WEB3_SERVICE_TOKEN: Web3 service token
 *
 * @returns Array of service tokens
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

  // Get Viber service token
  const viberServiceToken = process.env.VIBER_SERVICE_TOKEN;
  if (viberServiceToken && viberServiceToken.trim().length > 0) {
    tokens.push(viberServiceToken.trim());
  }

  // Get AI service token
  const aiServiceToken = process.env.AI_SERVICE_TOKEN;
  if (aiServiceToken && aiServiceToken.trim().length > 0) {
    tokens.push(aiServiceToken.trim());
  }

  // Get analytics service token
  const analyticsServiceToken = process.env.ANALYTICS_SERVICE_TOKEN;
  if (analyticsServiceToken && analyticsServiceToken.trim().length > 0) {
    tokens.push(analyticsServiceToken.trim());
  }

  // Get Web3 service token
  const web3ServiceToken = process.env.WEB3_SERVICE_TOKEN;
  if (web3ServiceToken && web3ServiceToken.trim().length > 0) {
    tokens.push(web3ServiceToken.trim());
  }

  return tokens;
}

/**
 * Get feature flags configuration
 *
 * @returns Feature flags configuration
 */
export function getFeatureFlags() {
  return {
    enableWalletCreation: ConfigHelper.getEnvBoolean(
      "WEB3_FEATURE_WALLET_CREATION",
      true
    ),
    enableTransactionSigning: ConfigHelper.getEnvBoolean(
      "WEB3_FEATURE_TRANSACTION_SIGNING",
      true
    ),
    enableContractInteraction: ConfigHelper.getEnvBoolean(
      "WEB3_FEATURE_CONTRACT_INTERACTION",
      true
    ),
    enableNFTOperations: ConfigHelper.getEnvBoolean(
      "WEB3_FEATURE_NFT_OPERATIONS",
      true
    ),
  };
}

/**
 * Get rate limiting configuration
 *
 * @returns Rate limiting configuration
 */
export function getRateLimiting() {
  return {
    requestsPerMinute: ConfigHelper.getEnvNumber(
      "WEB3_RATE_LIMIT_PER_MINUTE",
      60
    ),
    requestsPerHour: ConfigHelper.getEnvNumber(
      "WEB3_RATE_LIMIT_PER_HOUR",
      1000
    ),
  };
}

/**
 * Get complete Web3 service configuration
 *
 * @returns Web3 service configuration
 */
export function getWeb3ServiceConfig(): Web3ServiceConfig {
  return {
    encryptionKey: getEncryptionKey(),
    serviceTokens: getServiceTokens(),
    featureFlags: getFeatureFlags(),
    rateLimiting: getRateLimiting(),
  };
}

/**
 * Validate Web3 service configuration
 * Checks that all required configuration values are present
 */
export function validateWeb3ServiceConfig(): void {
  try {
    getEncryptionKey();
    // Other validations can be added here
  } catch (error) {
    throw new Error(
      `Invalid Web3 service configuration: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
