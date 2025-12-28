/**
 * Message Domain Types
 *
 * Type definitions for the Message domain
 */

/**
 * Message type enum
 *
 * Valid message types supported by Viber API
 */
export type MessageType =
  | "text"
  | "url"
  | "contact"
  | "picture"
  | "video"
  | "file"
  | "location"
  | "sticker"
  | "rich-media"
  | "keyboard";
