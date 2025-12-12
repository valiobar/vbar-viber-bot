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
 * Validation utilities
 */
export class ValidationUtils {
  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 255;
  }

  /**
   * Validate password strength
   */
  static isValidPassword(password: string): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }
    if (!/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }
    if (!/[0-9]/.test(password)) {
      errors.push("Password must contain at least one number");
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.push("Password must contain at least one special character");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate required fields in an object
   */
  static validateRequired<T extends Record<string, any>>(
    obj: T,
    requiredFields: (keyof T)[]
  ): {
    valid: boolean;
    missing: (keyof T)[];
  } {
    const missing = requiredFields.filter((field) => {
      const value = obj[field];
      return value === undefined || value === null || value === "";
    });

    return {
      valid: missing.length === 0,
      missing,
    };
  }
}

/**
 * Date/Time utilities
 */
export class DateUtils {
  /**
   * Get current ISO timestamp
   */
  static now(): string {
    return new Date().toISOString();
  }

  /**
   * Parse ISO date string to Date object
   */
  static parseISO(dateString: string): Date {
    return new Date(dateString);
  }

  /**
   * Format date to ISO string
   */
  static toISO(date: Date): string {
    return date.toISOString();
  }

  /**
   * Check if date is within range
   */
  static isWithinRange(date: Date, startDate: Date, endDate: Date): boolean {
    return date >= startDate && date <= endDate;
  }
}

/**
 * Error utilities
 */
export class ErrorUtils {
  /**
   * Create standardized error response
   */
  static createErrorResponse(
    code: string,
    message: string,
    details?: Record<string, any>
  ): {
    error: {
      code: string;
      message: string;
      details?: Record<string, any>;
    };
  } {
    return {
      error: {
        code,
        message,
        ...(details && { details }),
      },
    };
  }

  /**
   * Check if error is a known error type
   */
  static isKnownError(error: unknown): error is Error {
    return error instanceof Error;
  }
}

/**
 * String utilities
 */
export class StringUtils {
  /**
   * Generate random string
   */
  static randomString(length: number = 32): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Truncate string to max length
   */
  static truncate(
    str: string,
    maxLength: number,
    suffix: string = "..."
  ): string {
    if (str.length <= maxLength) {
      return str;
    }
    return str.substring(0, maxLength - suffix.length) + suffix;
  }

  /**
   * Convert string to slug
   */
  static slugify(str: string): string {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
}
