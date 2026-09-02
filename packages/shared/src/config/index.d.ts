/**
 * Shared configuration helpers and constants
 */
export { resolveRootEnvPath } from "./envPath";
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
export declare class ConfigHelper {
    /**
     * Get environment variable with default value
     */
    static getEnv(key: string, defaultValue?: string): string;
    /**
     * Get environment variable as number
     */
    static getEnvNumber(key: string, defaultValue?: number): number;
    /**
     * Get environment variable as boolean
     */
    static getEnvBoolean(key: string, defaultValue?: boolean): boolean;
    /**
     * Validate required environment variables
     */
    static validateRequired(requiredVars: string[]): void;
}
/**
 * Service configuration constants
 */
export declare const ServiceConfig: {
    /**
     * Default ports for services
     */
    readonly ports: {
        readonly admin: 3000;
        readonly viber: 3001;
        readonly ai: 3002;
    };
    /**
     * Message queue configuration
     */
    readonly messageQueue: {
        readonly queues: {
            readonly viberMessages: "viber.messages";
            readonly aiProcessed: "ai.processed";
            readonly adminConfig: "admin.config";
            readonly viberRefresh: "viber.refresh";
        };
        readonly exchanges: {
            readonly default: "viber-bot";
        };
    };
    /**
     * API configuration
     */
    readonly api: {
        readonly timeout: 30000;
        readonly retryAttempts: 3;
        readonly retryDelay: 1000;
    };
    /**
     * Database configuration
     */
    readonly database: {
        readonly connectionTimeout: 10000;
        readonly maxPoolSize: 10;
    };
};
/**
 * Error codes used across services
 */
export declare const ErrorCodes: {
    readonly MSG_001: "Invalid user ID";
    readonly MSG_002: "Message format invalid";
    readonly MSG_003: "Viber API error";
    readonly VAL_001: "Invalid input data";
    readonly VAL_002: "Missing required field";
    readonly VAL_003: "Invalid format";
    readonly AUTH_001: "Unauthorized";
    readonly AUTH_002: "Invalid token";
    readonly AUTH_003: "Token expired";
    readonly DB_001: "Database connection error";
    readonly DB_002: "Query failed";
    readonly DB_003: "Record not found";
    readonly SVC_001: "Service unavailable";
    readonly SVC_002: "Internal server error";
    readonly SVC_003: "Request timeout";
};
/**
 * Get error message by code
 */
export declare function getErrorMessage(code: keyof typeof ErrorCodes): string;
//# sourceMappingURL=index.d.ts.map