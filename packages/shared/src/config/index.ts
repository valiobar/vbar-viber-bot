/**
 * Shared configuration helpers and constants
 */

/**
 * Environment configuration interface
 */
export interface EnvironmentConfig {
  nodeEnv: "development" | "production" | "test";
  port: number;
  mongoUri: string;
  mongoDbName: string;
  rabbitMqUri: string;
  logLevel: "debug" | "info" | "warn" | "error";
  [key: string]: any;
}

/**
 * Configuration helper class
 */
export class ConfigHelper {
  /**
   * Get environment variable with default value
   */
  static getEnv(key: string, defaultValue?: string): string {
    const value = process.env[key];
    if (value === undefined) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new Error(`Environment variable ${key} is required but not set`);
    }
    return value;
  }

  /**
   * Get environment variable as number
   */
  static getEnvNumber(key: string, defaultValue?: number): number {
    const value = process.env[key];
    if (value === undefined) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new Error(`Environment variable ${key} is required but not set`);
    }
    const num = parseInt(value, 10);
    if (isNaN(num)) {
      throw new Error(`Environment variable ${key} must be a valid number`);
    }
    return num;
  }

  /**
   * Get environment variable as boolean
   */
  static getEnvBoolean(key: string, defaultValue?: boolean): boolean {
    const value = process.env[key];
    if (value === undefined) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new Error(`Environment variable ${key} is required but not set`);
    }
    return value.toLowerCase() === "true" || value === "1";
  }

  /**
   * Validate required environment variables
   */
  static validateRequired(requiredVars: string[]): void {
    const missing: string[] = [];
    for (const key of requiredVars) {
      if (process.env[key] === undefined) {
        missing.push(key);
      }
    }
    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(", ")}`
      );
    }
  }
}

/**
 * Service configuration constants
 */
export const ServiceConfig = {
  /**
   * Default ports for services
   */
  ports: {
    admin: 3000,
    viber: 3001,
    ai: 3002,
    analytics: 3003,
  },

  /**
   * Message queue configuration
   */
  messageQueue: {
    queues: {
      viberMessages: "viber.messages",
      aiProcessed: "ai.processed",
      analyticsEvents: "analytics.events",
      adminConfig: "admin.config",
    },
    exchanges: {
      default: "viber-bot",
    },
  },

  /**
   * API configuration
   */
  api: {
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
  },

  /**
   * Database configuration
   */
  database: {
    connectionTimeout: 10000, // 10 seconds
    maxPoolSize: 10,
  },
} as const;

/**
 * Error codes used across services
 */
export const ErrorCodes = {
  // Message errors
  MSG_001: "Invalid user ID",
  MSG_002: "Message format invalid",
  MSG_003: "Viber API error",
  // Validation errors
  VAL_001: "Invalid input data",
  VAL_002: "Missing required field",
  VAL_003: "Invalid format",
  // Authentication errors
  AUTH_001: "Unauthorized",
  AUTH_002: "Invalid token",
  AUTH_003: "Token expired",
  // Database errors
  DB_001: "Database connection error",
  DB_002: "Query failed",
  DB_003: "Record not found",
  // Service errors
  SVC_001: "Service unavailable",
  SVC_002: "Internal server error",
  SVC_003: "Request timeout",
} as const;

/**
 * Get error message by code
 */
export function getErrorMessage(code: keyof typeof ErrorCodes): string {
  return ErrorCodes[code] || "Unknown error";
}
