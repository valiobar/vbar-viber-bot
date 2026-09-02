/**
 * Shared utility functions used across microservices
 */

import * as path from "path";
import * as fs from "fs";

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
export class ConsoleLogger implements Logger {
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  private formatMessage(
    level: string,
    message: string,
    meta?: Record<string, any>
  ): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
    return `[${timestamp}] [${
      this.serviceName
    }] [${level.toUpperCase()}] ${message}${metaStr}`;
  }

  info(message: string, meta?: Record<string, any>): void {
    console.log(this.formatMessage("info", message, meta));
  }

  error(message: string, error?: Error | Record<string, any>): void {
    const errorMeta =
      error instanceof Error
        ? { error: error.message, stack: error.stack }
        : error;
    console.error(this.formatMessage("error", message, errorMeta));
  }

  warn(message: string, meta?: Record<string, any>): void {
    console.warn(this.formatMessage("warn", message, meta));
  }

  debug(message: string, meta?: Record<string, any>): void {
    if (process.env.NODE_ENV === "development") {
      console.debug(this.formatMessage("debug", message, meta));
    }
  }
}

/**
 * Path utilities for project structure navigation
 */
export class PathUtils {
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
  static findProjectRoot(startPath: string): string {
    let currentPath = startPath;
    const maxDepth = 10; // Prevent infinite loops
    let depth = 0;

    while (currentPath !== path.dirname(currentPath) && depth < maxDepth) {
      const packagesPath = path.join(currentPath, "packages", "shared");
      if (fs.existsSync(packagesPath)) {
        return currentPath;
      }
      currentPath = path.dirname(currentPath);
      depth++;
    }

    // Fallback: try from process.cwd() (useful in some deployment scenarios)
    const cwdPackagesPath = path.join(process.cwd(), "packages", "shared");
    if (fs.existsSync(cwdPackagesPath)) {
      return process.cwd();
    }

    throw new Error(
      `Could not find project root (packages/shared directory). ` +
        `Searched from: ${startPath}, cwd: ${process.cwd()}`
    );
  }
}
