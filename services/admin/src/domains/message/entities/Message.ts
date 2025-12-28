/**
 * Message Domain Entity
 *
 * Domain entity representing a Message in the Admin Service.
 * Messages are content templates that can be sent by the bot.
 * This entity includes validation and business logic for message content.
 */

import { MessageContent } from "../value-objects/MessageContent";
import { MessageType } from "../types";

/**
 * Message domain entity
 *
 * Represents a message template with type-specific content.
 * Messages are stored in Viber API-compatible format for the Viber Service to use.
 */
export class Message {
  public readonly id: string;
  public readonly type: MessageType;
  public readonly content: MessageContent;
  public readonly url: string | null;
  public readonly humanReadableName: string;
  public readonly hidden: boolean;
  public readonly createdAt: string;
  public readonly updatedAt: string;

  /**
   * Creates a new Message domain entity
   *
   * @param params - Message properties
   * @throws Error if validation fails
   */
  constructor(params: {
    id: string;
    type: MessageType;
    content: MessageContent;
    url: string | null;
    humanReadableName: string;
    hidden?: boolean;
    createdAt: string;
    updatedAt: string;
  }) {
    // Validate and set properties
    this.id = params.id;
    this.type = this.validateType(params.type);
    this.content = params.content;
    this.url = this.validateUrl(params.url, params.type);
    this.humanReadableName = this.validateHumanReadableName(
      params.humanReadableName
    );
    this.hidden = params.hidden ?? false;
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;
  }

  /**
   * Validates message type
   *
   * @param type - Message type to validate
   * @returns Validated message type
   * @throws Error if type is invalid
   */
  private validateType(type: string): MessageType {
    const validTypes: MessageType[] = [
      "text",
      "url",
      "contact",
      "picture",
      "video",
      "file",
      "location",
      "sticker",
      "rich-media",
      "keyboard",
    ];

    if (!validTypes.includes(type as MessageType)) {
      throw new Error(
        `Invalid message type. Must be one of: ${validTypes.join(", ")}`
      );
    }

    return type as MessageType;
  }

  /**
   * Validates URL field
   *
   * @param url - URL to validate
   * @param type - Message type
   * @returns Validated URL or null
   * @throws Error if URL is invalid
   */
  private validateUrl(url: string | null, type: MessageType): string | null {
    // URL is required for url-type messages
    if (type === "url") {
      if (!url || typeof url !== "string") {
        throw new Error("URL is required for url-type messages");
      }

      const trimmedUrl = url.trim();
      if (trimmedUrl.length === 0) {
        throw new Error("URL cannot be empty for url-type messages");
      }

      // Basic URL format validation
      try {
        new URL(trimmedUrl);
      } catch {
        throw new Error("Invalid URL format");
      }

      return trimmedUrl;
    }

    // URL is optional (null) for other types
    return url === null || url === undefined ? null : null;
  }

  /**
   * Validates human-readable name
   *
   * @param name - Name to validate
   * @returns Validated name
   * @throws Error if name is invalid
   */
  private validateHumanReadableName(name: string): string {
    if (!name || typeof name !== "string") {
      throw new Error("Human-readable name is required and must be a string");
    }

    const trimmedName = name.trim();

    if (trimmedName.length === 0) {
      throw new Error("Human-readable name cannot be empty");
    }

    if (trimmedName.length > 100) {
      throw new Error("Human-readable name must be 100 characters or less");
    }

    return trimmedName;
  }

  /**
   * Checks if message is hidden
   *
   * @returns True if message is hidden
   */
  public isHidden(): boolean {
    return this.hidden;
  }

  /**
   * Gets content in Viber API format
   *
   * @returns Content object for Viber API
   */
  public getContentForViberApi(): object {
    return this.content.getForViberApi();
  }

  /**
   * Creates a Message entity from database document
   *
   * @param doc - Database document (MongoDB document with _id)
   * @returns Message domain entity
   */
  public static fromDatabaseDocument(doc: {
    _id: string | { toString(): string };
    type: MessageType;
    content: object;
    url?: string | null;
    humanReadableName: string;
    hidden?: boolean;
    createdAt: Date | string;
    updatedAt: Date | string;
  }): Message {
    // Convert ObjectId to string if needed
    const id = typeof doc._id === "string" ? doc._id : doc._id.toString();

    // Convert dates to ISO strings
    const createdAt =
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : doc.createdAt;
    const updatedAt =
      doc.updatedAt instanceof Date
        ? doc.updatedAt.toISOString()
        : doc.updatedAt;

    // Create MessageContent value object
    const content = new MessageContent(doc.type, doc.content);

    return new Message({
      id,
      type: doc.type,
      content,
      url: doc.url ?? null,
      humanReadableName: doc.humanReadableName,
      hidden: doc.hidden,
      createdAt,
      updatedAt,
    });
  }

  /**
   * Creates a new Message entity
   *
   * @param params - Message creation parameters
   * @returns New Message domain entity
   */
  public static create(params: {
    type: MessageType;
    content: object;
    url?: string | null;
    humanReadableName: string;
    hidden?: boolean;
  }): Message {
    const now = new Date().toISOString();

    // Create MessageContent value object
    const content = new MessageContent(params.type, params.content);

    // Generate a temporary ID (will be replaced by repository)
    const tempId = `temp-${Date.now()}`;

    return new Message({
      id: tempId,
      type: params.type,
      content,
      url: params.url ?? null,
      humanReadableName: params.humanReadableName,
      hidden: params.hidden ?? false,
      createdAt: now,
      updatedAt: now,
    });
  }
}
