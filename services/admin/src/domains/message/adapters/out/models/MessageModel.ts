/**
 * Mongoose Message Model
 *
 * Defines the MongoDB schema and model for Message documents.
 * Messages are content templates that can be sent by the bot.
 */

import mongoose, { Schema, Model } from "mongoose";
import { MessageType } from "../../../types";

/**
 * Message document interface (MongoDB document structure)
 */
export interface IMessageDocument extends mongoose.Document {
  type: MessageType;
  content: object; // Flexible structure based on message type
  url: string | null;
  humanReadableName: string;
  hidden: boolean;
  botId: string; // Required BotInstance ID (string identifier)
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Message schema definition
 */
const messageSchema = new Schema<IMessageDocument>(
  {
    type: {
      type: String,
      required: true,
      enum: [
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
      ],
      validate: {
        validator: function (value: string) {
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
          return validTypes.includes(value as MessageType);
        },
        message: "Invalid message type",
      },
    },
    content: {
      type: Schema.Types.Mixed,
      required: true,
      validate: {
        validator: function (value: any) {
          return value !== null && typeof value === "object";
        },
        message: "Content must be an object",
      },
    },
    url: {
      type: String,
      required: false,
      default: null,
      validate: {
        validator: function (value: string | null) {
          // URL is required for url-type messages (validated in pre-save)
          // For other types, allow null
          if (value === null) {
            return true;
          }
          // Basic URL format validation
          try {
            new URL(value);
            return true;
          } catch {
            return false;
          }
        },
        message: "URL must be a valid URL format or null",
      },
    },
    humanReadableName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      validate: {
        validator: function (value: string) {
          return !!(value && value.trim().length > 0);
        },
        message: "Human-readable name cannot be empty",
      },
    },
    hidden: {
      type: Boolean,
      default: false,
    },
    botId: {
      type: String,
      required: true,
      index: true, // Add index for efficient querying
      validate: {
        validator: function (value: string) {
          return typeof value === "string" && value.trim().length > 0;
        },
        message: "botId is required and must be a non-empty string",
      },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false, // We handle timestamps manually in pre-save hook
    collection: "messages",
  }
);

// Indexes for efficient querying
messageSchema.index({ botId: 1 }); // Single field index
messageSchema.index({ botId: 1, hidden: 1 }); // Compound index for filtering by botId and hidden status

/**
 * Pre-save hook for message schema
 * Validates conditional required fields and updates timestamp
 */
messageSchema.pre("save", async function () {
  // Update updatedAt timestamp
  (this as any).updatedAt = new Date();

  // Validate URL requirement for url-type messages
  if (this.type === "url") {
    if (
      !this.url ||
      typeof this.url !== "string" ||
      this.url.trim().length === 0
    ) {
      throw new Error("URL is required for url-type messages");
    }
  }

  // Validate content structure based on type (basic validation)
  // More detailed validation is handled by MessageContent value object
  if (!this.content || typeof this.content !== "object") {
    throw new Error("Content must be an object");
  }
});

/**
 * Message model
 * Uses singleton pattern to prevent model recompilation
 */
let MessageModel: Model<IMessageDocument>;

if (mongoose.models.Message) {
  MessageModel = mongoose.models.Message as Model<IMessageDocument>;
} else {
  MessageModel = mongoose.model<IMessageDocument>("Message", messageSchema);
}

export { MessageModel };
