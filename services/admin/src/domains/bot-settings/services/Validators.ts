/**
 * Bot Settings Domain Validators
 *
 * Centralized validation functions for BotSettings entity.
 * All validation logic is extracted here for better code organization and reusability.
 */

import { BotStatus } from "../types";

/**
 * Validator utility class with static methods for validating BotSettings properties
 */
export class Validators {
  /**
   * Validates bot name
   *
   * @param botName - Bot name to validate
   * @returns Validated bot name
   * @throws Error if bot name is invalid
   */
  static validateBotName(botName: string): string {
    if (!botName || typeof botName !== "string") {
      throw new Error("Bot name is required and must be a string");
    }

    const trimmedName = botName.trim();

    if (trimmedName.length === 0) {
      throw new Error("Bot name cannot be empty");
    }

    return trimmedName;
  }

  /**
   * Validates URL
   *
   * @param url - URL to validate
   * @param fieldName - Name of the field for error messages
   * @returns Validated URL or null
   * @throws Error if URL is invalid
   */
  static validateUrl(
    url: string | null | undefined,
    fieldName: string
  ): string | null {
    if (url === null || url === undefined) {
      return null;
    }

    if (typeof url !== "string") {
      throw new Error(`${fieldName} must be a string or null`);
    }

    const trimmedUrl = url.trim();

    if (trimmedUrl.length === 0) {
      return null;
    }

    // Basic URL validation
    try {
      new URL(trimmedUrl);
      return trimmedUrl;
    } catch {
      throw new Error(`${fieldName} must be a valid URL`);
    }
  }

  /**
   * Validates hex color code
   *
   * @param color - Color to validate
   * @param fieldName - Name of the field for error messages
   * @returns Validated color or null
   * @throws Error if color is invalid
   */
  static validateColor(
    color: string | null | undefined,
    fieldName: string
  ): string | null {
    if (color === null || color === undefined) {
      return null;
    }

    if (typeof color !== "string") {
      throw new Error(`${fieldName} must be a string or null`);
    }

    const trimmedColor = color.trim();

    if (trimmedColor.length === 0) {
      return null;
    }

    // Validate hex color format (#RRGGBB or #RRGGBBAA)
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;
    if (!hexColorRegex.test(trimmedColor)) {
      throw new Error(
        `${fieldName} must be a valid hex color code (e.g., #FF0000 or #FF0000FF)`
      );
    }

    return trimmedColor;
  }

  /**
   * Validates bot status
   *
   * @param status - Status to validate
   * @returns Validated status
   * @throws Error if status is invalid
   */
  static validateStatus(status: BotStatus | undefined): BotStatus {
    if (status === undefined) {
      return "active"; // Default status
    }

    const validStatuses: BotStatus[] = ["active", "inactive", "maintenance"];

    if (!validStatuses.includes(status)) {
      throw new Error(`Status must be one of: ${validStatuses.join(", ")}`);
    }

    return status;
  }

  /**
   * Validates MongoDB ObjectId format
   *
   * @param id - ObjectId to validate
   * @param fieldName - Name of the field for error messages
   * @returns Validated ObjectId or null
   * @throws Error if ObjectId is invalid
   */
  static validateObjectId(
    id: string | null | undefined,
    fieldName: string
  ): string | null {
    if (id === null || id === undefined) {
      return null;
    }

    if (typeof id !== "string") {
      throw new Error(`${fieldName} must be a string or null`);
    }

    const trimmedId = id.trim();

    if (trimmedId.length === 0) {
      return null;
    }

    // MongoDB ObjectId is 24 hex characters
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    if (!objectIdRegex.test(trimmedId)) {
      throw new Error(
        `${fieldName} must be a valid MongoDB ObjectId (24 hex characters)`
      );
    }

    return trimmedId;
  }
}
