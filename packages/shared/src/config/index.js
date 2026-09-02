"use strict";
/**
 * Shared configuration helpers and constants
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCodes = exports.ServiceConfig = exports.ConfigHelper = exports.resolveRootEnvPath = void 0;
exports.getErrorMessage = getErrorMessage;
var envPath_1 = require("./envPath");
Object.defineProperty(exports, "resolveRootEnvPath", { enumerable: true, get: function () { return envPath_1.resolveRootEnvPath; } });
/**
 * Configuration helper class
 */
class ConfigHelper {
    /**
     * Get environment variable with default value
     */
    static getEnv(key, defaultValue) {
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
    static getEnvNumber(key, defaultValue) {
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
    static getEnvBoolean(key, defaultValue) {
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
    static validateRequired(requiredVars) {
        const missing = [];
        for (const key of requiredVars) {
            if (process.env[key] === undefined) {
                missing.push(key);
            }
        }
        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
        }
    }
}
exports.ConfigHelper = ConfigHelper;
/**
 * Service configuration constants
 */
exports.ServiceConfig = {
    /**
     * Default ports for services
     */
    ports: {
        admin: 3000,
        viber: 3001,
        ai: 3002,
    },
    /**
     * Message queue configuration
     */
    messageQueue: {
        queues: {
            viberMessages: "viber.messages",
            aiProcessed: "ai.processed",
            adminConfig: "admin.config",
            viberRefresh: "viber.refresh",
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
};
/**
 * Error codes used across services
 */
exports.ErrorCodes = {
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
};
/**
 * Get error message by code
 */
function getErrorMessage(code) {
    return exports.ErrorCodes[code] || "Unknown error";
}
//# sourceMappingURL=index.js.map