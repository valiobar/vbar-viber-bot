/**
 * Shared utility functions used across microservices
 */
/**
 * Logger utility interface
 */
export interface Logger {
    info(message: string, meta?: Record<string, any>): void;
    error(message: string, error?: Error | Record<string, any>): void;
    warn(message: string, meta?: Record<string, any>): void;
    debug(message: string, meta?: Record<string, any>): void;
}
/**
 * Simple console logger implementation
 */
export declare class ConsoleLogger implements Logger {
    private serviceName;
    constructor(serviceName: string);
    private formatMessage;
    info(message: string, meta?: Record<string, any>): void;
    error(message: string, error?: Error | Record<string, any>): void;
    warn(message: string, meta?: Record<string, any>): void;
    debug(message: string, meta?: Record<string, any>): void;
}
/**
 * Path utilities for project structure navigation
 */
export declare class PathUtils {
    /**
     * Find project root by looking for packages/shared directory
     *
     * Traverses up the directory tree from the start path to find
     * the project root (where packages/shared exists).
     *
     * @param startPath - Starting path to search from (typically __dirname)
     * @returns Absolute path to project root
     * @throws Error if project root cannot be found
     */
    static findProjectRoot(startPath: string): string;
}
//# sourceMappingURL=index.d.ts.map