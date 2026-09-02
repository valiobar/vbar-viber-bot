/**
 * Mongoose BotSettings Model
 *
 * Defines the MongoDB schema and model for BotSettings documents.
 * Bot Settings follow a singleton pattern (only one settings document exists).
 */

import mongoose, { Schema, Model } from "mongoose";
import { BotStatus } from "./types";

/**
 * BotSettings document interface (MongoDB document structure)
 */
export interface IBotSettingsDocument extends mongoose.Document {
  avatarURL: string | null;
  botName: string;
  botViberName: string | null;
  status: BotStatus;
  buttonsBackground: string | null;
  buttonsTextColor: string | null;
  buttonsPrefix: string | null;
  welcomeStepId: mongoose.Types.ObjectId | null; // Reference to Step model
  GAKey: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * BotSettings schema definition
 */
const botSettingsSchema = new Schema<IBotSettingsDocument>(
  {
    avatarURL: {
      type: String,
      required: false,
      default: null,
      validate: {
        validator: function (value: string | null) {
          // Allow null or valid URL
          if (value === null || value === undefined) {
            return true;
          }
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
    botName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      validate: {
        validator: function (value: string) {
          return !!(value && value.trim().length > 0);
        },
        message: "Bot name is required and cannot be empty",
      },
    },
    botViberName: {
      type: String,
      required: false,
      default: null,
      trim: true,
      maxlength: 100,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "maintenance"],
      default: "active",
      required: true,
    },
    buttonsBackground: {
      type: String,
      required: false,
      default: null,
      validate: {
        validator: function (value: string | null) {
          // Allow null or valid hex color
          if (value === null || value === undefined) {
            return true;
          }
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
          // Allow null or valid hex color
          if (value === null || value === undefined) {
            return true;
          }
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
      maxlength: 50,
    },
    welcomeStepId: {
      type: Schema.Types.ObjectId,
      ref: "Step",
      required: false,
      default: null,
      validate: {
        validator: function (value: mongoose.Types.ObjectId | null) {
          if (value === null || value === undefined) {
            return true;
          }
          return mongoose.Types.ObjectId.isValid(value);
        },
        message: "welcomeStepId must be a valid Step ID or null",
      },
    },
    GAKey: {
      type: String,
      required: false,
      default: null,
      trim: true,
      maxlength: 100,
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
    collection: "botsettings",
  }
);

/**
 * Pre-save hook for bot settings schema
 * Updates timestamp
 */
botSettingsSchema.pre("save", async function () {
  // Update updatedAt timestamp
  (this as any).updatedAt = new Date();
});

// Index on createdAt for sorting
botSettingsSchema.index({ createdAt: -1 });

/**
 * BotSettings model
 * Uses singleton pattern to prevent model recompilation
 */
let BotSettingsModel: Model<IBotSettingsDocument>;

if (mongoose.models.BotSettings) {
  BotSettingsModel = mongoose.models.BotSettings as Model<IBotSettingsDocument>;
} else {
  BotSettingsModel = mongoose.model<IBotSettingsDocument>(
    "BotSettings",
    botSettingsSchema
  );
}

export { BotSettingsModel };
