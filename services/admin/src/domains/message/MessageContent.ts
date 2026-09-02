/**
 * MessageContent Value Object
 *
 * Represents message content with type-specific validation.
 * This is a value object that encapsulates content data based on message type.
 */

import { MessageType } from "./types";

/**
 * MessageContent value object
 *
 * Encapsulates message content data with type-specific validation.
 * Content structure varies by message type.
 */
export class MessageContent {
  private readonly _type: MessageType;
  private readonly _data: object;

  /**
   * Creates a new MessageContent value object
   *
   * @param type - Message type
   * @param data - Content data (structure varies by type)
   * @throws Error if content is invalid for the given type
   */
  constructor(type: MessageType, data: object) {
    this._type = type;
    this._data = this.validateContent(data, type);
  }

  /**
   * Validates content structure based on message type
   *
   * @param data - Content data to validate
   * @param type - Message type
   * @returns Validated content data
   * @throws Error if content is invalid
   */
  private validateContent(data: object, type: MessageType): object {
    if (!data || typeof data !== "object") {
      throw new Error("Content must be an object");
    }

    switch (type) {
      case "text":
        if (!("text" in data) || typeof (data as any).text !== "string") {
          throw new Error(`${type} message must have a 'text' field`);
        }
        break;

      case "keyboard":
        // Keyboard messages don't require text - they can be sent with just buttons
        if ("text" in data && typeof (data as any).text !== "string") {
          throw new Error(
            "keyboard message 'text' field must be a string if provided"
          );
        }
        // Keyboard messages should have a keyboard object with buttons
        if (
          !("keyboard" in data) ||
          typeof (data as any).keyboard !== "object"
        ) {
          throw new Error("keyboard message must have a 'keyboard' field");
        }
        break;

      case "picture":
        if (!("media" in data) || typeof (data as any).media !== "string") {
          throw new Error("picture message must have a 'media' field");
        }
        if ("text" in data && typeof (data as any).text !== "string") {
          throw new Error("picture message 'text' field must be a string");
        }
        if (
          "thumbnail" in data &&
          typeof (data as any).thumbnail !== "string"
        ) {
          throw new Error("picture message 'thumbnail' field must be a string");
        }
        break;

      case "video":
        if (!("media" in data) || typeof (data as any).media !== "string") {
          throw new Error("video message must have a 'media' field");
        }
        if ("text" in data && typeof (data as any).text !== "string") {
          throw new Error("video message 'text' field must be a string");
        }
        if (
          "thumbnail" in data &&
          typeof (data as any).thumbnail !== "string"
        ) {
          throw new Error("video message 'thumbnail' field must be a string");
        }
        if ("size" in data && typeof (data as any).size !== "number") {
          throw new Error("video message 'size' field must be a number");
        }
        if ("duration" in data && typeof (data as any).duration !== "number") {
          throw new Error("video message 'duration' field must be a number");
        }
        break;

      case "file":
        if (!("media" in data) || typeof (data as any).media !== "string") {
          throw new Error("file message must have a 'media' field");
        }
        if ("size" in data && typeof (data as any).size !== "number") {
          throw new Error("file message 'size' field must be a number");
        }
        if (
          "file_name" in data &&
          typeof (data as any).file_name !== "string"
        ) {
          throw new Error("file message 'file_name' field must be a string");
        }
        break;

      case "location":
        if (
          !("lat" in data) ||
          typeof (data as any).lat !== "number" ||
          !("lon" in data) ||
          typeof (data as any).lon !== "number"
        ) {
          throw new Error(
            "location message must have 'lat' and 'lon' number fields"
          );
        }
        break;

      case "contact":
        if (
          !("name" in data) ||
          typeof (data as any).name !== "string" ||
          !("phone_number" in data) ||
          typeof (data as any).phone_number !== "string"
        ) {
          throw new Error(
            "contact message must have 'name' and 'phone_number' string fields"
          );
        }
        break;

      case "sticker":
        if (
          !("sticker_id" in data) ||
          typeof (data as any).sticker_id !== "number"
        ) {
          throw new Error(
            "sticker message must have a 'sticker_id' number field"
          );
        }
        break;

      case "url":
      case "rich-media":
        // Content may be empty for url and rich-media types
        // url uses the url field, rich-media is for carousels
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }

    return data;
  }

  /**
   * Gets the message type
   *
   * @returns Message type
   */
  public getType(): MessageType {
    return this._type;
  }

  /**
   * Gets the content data
   *
   * @returns Content data object
   */
  public getData(): object {
    return this._data;
  }

  /**
   * Gets content in Viber API format
   *
   * @returns Content object for Viber API
   */
  public getForViberApi(): object {
    return this._data;
  }

  /**
   * Checks if this value object equals another
   *
   * @param other - Other MessageContent to compare
   * @returns True if equal
   */
  public equals(other: MessageContent): boolean {
    if (!other || !(other instanceof MessageContent)) {
      return false;
    }

    if (this._type !== other._type) {
      return false;
    }

    // Deep equality check for data objects
    return JSON.stringify(this._data) === JSON.stringify(other.getData());
  }
}
