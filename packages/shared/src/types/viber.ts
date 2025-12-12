/**
 * Types for Viber Service
 */

import { BaseEntity } from "./common";

/**
 * Message interface
 */
export interface Message extends BaseEntity {
  userId: string;
  conversationId?: string;
  type: string;
  content: Record<string, any>;
  direction: "incoming" | "outgoing";
  status: "sent" | "delivered" | "seen" | "failed";
  timestamp: string;
}

/**
 * Send Message Request
 */
export interface SendMessageRequest {
  userId: string;
  message: {
    type:
      | "text"
      | "picture"
      | "video"
      | "file"
      | "location"
      | "contact"
      | "sticker"
      | "url";
    text?: string;
    media?: string;
    location?: {
      lat: number;
      lon: number;
    };
    keyboard?: {
      Type: "keyboard";
      DefaultHeight: boolean;
      Buttons: Array<{
        ActionType: string;
        ActionBody: string;
        Text: string;
      }>;
    };
  };
}

/**
 * Send Message Response
 */
export interface SendMessageResponse {
  messageToken: number;
  status: "sent" | "failed";
  timestamp: string;
}

