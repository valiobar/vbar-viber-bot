/**
 * Mongoose Keyboard Model
 *
 * Defines the MongoDB schema and model for Keyboard documents.
 * Keyboards contain embedded Button documents.
 */

import mongoose, { Schema, Model } from "mongoose";
import { buttonSchema } from "./ButtonModel";
import type { InputFieldState } from "../../../types";

/**
 * Keyboard document interface (MongoDB document structure)
 */
export interface IKeyboardDocument extends mongoose.Document {
  Type: string;
  Buttons: any[]; // Embedded Button documents
  DefaultHeight: boolean;
  InputFieldState: InputFieldState;
  BgColor: string | null;
  hidden: boolean;
  humanReadableName: string;
  title: string | null;
  isBroadcast: boolean;
  botId: string; // Required BotInstance ID (string identifier)
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Keyboard schema definition
 */
const keyboardSchema = new Schema<IKeyboardDocument>(
  {
    Type: {
      type: String,
      default: "keyboard",
      required: true,
    },
    Buttons: {
      type: [buttonSchema],
      required: true,
      validate: {
        validator: function (buttons: any[]) {
          return Array.isArray(buttons) && buttons.length > 0;
        },
        message:
          "Buttons array is required and must contain at least one button",
      },
    } as any,
    DefaultHeight: {
      type: Boolean,
      default: false,
    },
    InputFieldState: {
      type: String,
      enum: ["regular", "minimized", "hidden"],
      default: "regular",
    },
    BgColor: {
      type: String,
      required: false,
      default: null,
      validate: {
        validator: function (value: string | null) {
          // Allow null or valid hex color
          return (
            value === null || /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/.test(value)
          );
        },
        message: "BgColor must be a valid hex color code or null",
      },
    },
    hidden: {
      type: Boolean,
      default: false,
    },
    humanReadableName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    title: {
      type: String,
      required: false,
      default: null,
      trim: true,
    },
    isBroadcast: {
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
    collection: "keyboards",
  }
);

// Indexes for efficient querying
keyboardSchema.index({ hidden: 1 });
keyboardSchema.index({ isBroadcast: 1 });
keyboardSchema.index({ humanReadableName: 1 });
keyboardSchema.index({ hidden: 1, isBroadcast: 1 }); // Compound index for common queries
keyboardSchema.index({ botId: 1 }); // Single field index
keyboardSchema.index({ botId: 1, hidden: 1 }); // Compound index for filtering by botId and hidden status

/**
 * Pre-save hook for keyboard schema
 * Formats button text (wraps in font tag if needed) and updates timestamp
 * Validates conditional required fields for buttons
 */
keyboardSchema.pre("save", async function () {
  // Update updatedAt timestamp
  (this as any).updatedAt = new Date();

  // Validate and format buttons
  const buttons = (this as any).Buttons;
  if (buttons && Array.isArray(buttons)) {
    // Validate all buttons first
    for (const button of buttons) {
      // Validate conditional required fields for open-url action
      if (button.ActionType === "open-url") {
        if (!button.OpenURLType) {
          throw new Error(
            "OpenURLType is required when ActionType is 'open-url'"
          );
        }
        if (!button.InternalBrowser || !button.InternalBrowser.Mode) {
          throw new Error(
            "InternalBrowser is required when ActionType is 'open-url'"
          );
        }
      }

      // Format text: wrap in font tag if not already formatted
      // if (button.Text && !button.Text.includes("<font")) {
      //   button.Text = `<font color="${button.TextColor}">${button.Text}</font>`;
      // }
      // Update button updatedAt timestamp
      button.updatedAt = new Date();
    }
  }
});

/**
 * Keyboard model
 * Uses singleton pattern to prevent model recompilation
 */
let KeyboardModel: Model<IKeyboardDocument>;

if (mongoose.models.Keyboard) {
  KeyboardModel = mongoose.models.Keyboard as Model<IKeyboardDocument>;
} else {
  KeyboardModel = mongoose.model<IKeyboardDocument>("Keyboard", keyboardSchema);
}

export { KeyboardModel };
