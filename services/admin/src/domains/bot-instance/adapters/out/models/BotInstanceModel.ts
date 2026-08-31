/**
 * Mongoose BotInstance Model
 *
 * Defines the MongoDB schema and model for BotInstance documents.
 * BotInstance represents a bot instance configuration for a specific platform (Viber, Telegram, etc.).
 */

import mongoose, { Schema, Model } from "mongoose";
import type { BotPlatform, BotStatus } from "../../../types";

/**
 * BotInstance document interface (MongoDB document structure)
 */
export interface IBotInstanceDocument extends mongoose.Document {
  name: string;
  platform: BotPlatform;
  token: string; // Encrypted token
  status: BotStatus;
  botId: string; // Unique bot identifier
  // Platform-specific fields (optional)
  botViberName?: string | null;
  botTelegramUsername?: string | null;
  botTelegramDescription?: string | null;
  commands?: Array<{
    command: string;
    description: string;
  }>;
  // Common bot settings (optional)
  avatarURL?: string | null;
  buttonsBackground?: string | null;
  buttonsTextColor?: string | null;
  buttonsPrefix?: string | null;
  welcomeStepId?: mongoose.Types.ObjectId | null;
  GAKey?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * BotInstance schema definition
 */
const botInstanceSchema = new Schema<IBotInstanceDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    platform: {
      type: String,
      required: true,
      enum: ["viber", "telegram"],
      index: true,
    },
    token: {
      type: String,
      required: true,
      validate: {
        validator: function (value: string) {
          return Boolean(value && value.trim().length > 0);
        },
        message: "Token is required and cannot be empty",
      },
    },
    status: {
      type: String,
      required: true,
      enum: ["active", "inactive", "pending"],
      default: "pending",
      index: true,
    },
    botId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
      validate: {
        validator: function (value: string) {
          return Boolean(value && value.trim().length > 0);
        },
        message: "botId is required and cannot be empty",
      },
    },
    // Platform-specific fields (optional)
    botViberName: {
      type: String,
      required: false,
      default: null,
      trim: true,
    },
    botTelegramUsername: {
      type: String,
      required: false,
      default: null,
      trim: true,
      // Unique when platform is telegram (handled in pre-save hook)
    },
    botTelegramDescription: {
      type: String,
      required: false,
      default: null,
      trim: true,
    },
    commands: {
      type: [
        {
          command: {
            type: String,
            required: true,
            trim: true,
          },
          description: {
            type: String,
            required: true,
            trim: true,
          },
        },
      ],
      required: false,
      default: undefined,
    },
    // Common bot settings (optional)
    avatarURL: {
      type: String,
      required: false,
      default: null,
      validate: {
        validator: function (value: string | null) {
          if (value === null || value === undefined) {
            return true;
          }
          // Basic URL validation
          try {
            new URL(value);
            return true;
          } catch {
            return false;
          }
        },
        message: "avatarURL must be a valid URL or null",
      },
    },
    buttonsBackground: {
      type: String,
      required: false,
      default: null,
      validate: {
        validator: function (value: string | null) {
          if (value === null || value === undefined) {
            return true;
          }
          // Validate hex color format
          return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/.test(value);
        },
        message: "buttonsBackground must be a valid hex color code or null",
      },
    },
    buttonsTextColor: {
      type: String,
      required: false,
      default: null,
      validate: {
        validator: function (value: string | null) {
          if (value === null || value === undefined) {
            return true;
          }
          // Validate hex color format
          return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/.test(value);
        },
        message: "buttonsTextColor must be a valid hex color code or null",
      },
    },
    buttonsPrefix: {
      type: String,
      required: false,
      default: null,
      trim: true,
    },
    welcomeStepId: {
      type: Schema.Types.ObjectId,
      ref: "Step",
      required: false,
      default: null,
    },
    GAKey: {
      type: String,
      required: false,
      default: null,
      trim: true,
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
    collection: "botinstances",
  }
);

// Indexes for efficient querying
botInstanceSchema.index({ platform: 1 }); // For filtering by platform
botInstanceSchema.index({ status: 1 }); // For filtering by status
botInstanceSchema.index({ botId: 1 }); // Unique index for botId (already defined in field)
botInstanceSchema.index({ platform: 1, status: 1 }); // Compound index for common queries
botInstanceSchema.index({ name: 1 }); // For searching by name

/**
 * Pre-save hook for bot instance schema
 * Validates platform-specific fields and updates timestamp
 */
botInstanceSchema.pre("save", async function () {
  // Update updatedAt timestamp
  (this as any).updatedAt = new Date();

  // Validate platform-specific fields
  if (this.platform === "telegram") {
    // For Telegram, botTelegramUsername should be unique (handled by application logic)
    // We can add additional validation here if needed
  }

  // Validate token is not empty (already handled in schema, but double-check)
  if (!this.token || this.token.trim().length === 0) {
    throw new Error("Token is required and cannot be empty");
  }

  // Validate botId is not empty (already handled in schema, but double-check)
  if (!this.botId || this.botId.trim().length === 0) {
    throw new Error("botId is required and cannot be empty");
  }
});

/**
 * BotInstance model
 * Uses singleton pattern to prevent model recompilation
 */
let BotInstanceModel: Model<IBotInstanceDocument>;

if (mongoose.models.BotInstance) {
  BotInstanceModel = mongoose.models.BotInstance as Model<IBotInstanceDocument>;
} else {
  BotInstanceModel = mongoose.model<IBotInstanceDocument>(
    "BotInstance",
    botInstanceSchema
  );
}

export { BotInstanceModel };

