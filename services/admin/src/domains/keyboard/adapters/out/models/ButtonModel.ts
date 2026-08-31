/**
 * Mongoose Button Model (Embedded Schema)
 *
 * Defines the MongoDB embedded schema for Button documents.
 * This schema is used as an embedded document within Keyboard documents.
 */

import mongoose, { Schema } from "mongoose";
import type {
  ActionType,
  TextSize,
  TextVAlign,
  TextHAlign,
  BgMediaType,
  OpenURLType,
  InternalBrowserConfig,
} from "../../../types";

/**
 * Button document interface (embedded document structure)
 * Buttons are always embedded within Keyboard documents.
 */
export interface IButtonDocument {
  Columns: number;
  Rows: number;
  Text: string;
  TextColor: string;
  BgColor: string | null;
  BgMedia: string | null;
  BgMediaType: BgMediaType;
  BgMediaScaleType: string;
  BgLoop: boolean;
  ActionType: ActionType;
  ActionBody: string;
  OpenURLType?: OpenURLType; // Optional, required when ActionType is 'open-url'
  InternalBrowser?: InternalBrowserConfig; // Optional, required when ActionType is 'open-url'
  TextVAlign: TextVAlign;
  TextHAlign: TextHAlign;
  TextSize: TextSize;
  Silent: boolean;
  isJson: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Internal browser subdocument schema
 */
const internalBrowserSchema = new Schema(
  {
    Mode: {
      type: String,
      enum: ["fullscreen-portrait", "fullscreen-landscape", "partial-size"],
      required: true,
    },
  },
  { _id: false }
);

/**
 * Button embedded schema definition
 * Matches Button entity structure with all validation rules
 *
 * Note: Pre-save hooks don't work on embedded subdocuments in Mongoose.
 * Button text formatting is handled in KeyboardModel's pre-save hook.
 *
 * Note: Schema is not typed with generic to avoid TypeScript issues when used in arrays.
 */
export const buttonSchema = new Schema(
  {
    Columns: {
      type: Number,
      required: true,
      min: 1,
      max: 6,
      default: 1,
    },
    Rows: {
      type: Number,
      required: true,
      min: 1,
      max: 2,
      default: 1,
    },
    Text: {
      type: String,
      required: true,
      default: "",
    },
    TextColor: {
      type: String,
      required: true,
      match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/,
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
    BgMedia: {
      type: String,
      required: false,
      default: null,
    },
    BgMediaType: {
      type: String,
      enum: ["picture", "gif"],
      default: "picture",
    },
    BgMediaScaleType: {
      type: String,
      default: "fit",
    },
    BgLoop: {
      type: Boolean,
      default: true,
    },
    ActionType: {
      type: String,
      required: true,
      enum: ["reply", "open-url", "location-picker", "share-phone", "none"],
    },
    ActionBody: {
      type: String,
      required: true,
    },
    OpenURLType: {
      type: String,
      enum: ["internal", "external"],
      required: false, // Conditionally validated in KeyboardModel pre-save hook
    },
    InternalBrowser: {
      type: internalBrowserSchema,
      required: false, // Conditionally validated in KeyboardModel pre-save hook
    },
    TextVAlign: {
      type: String,
      enum: ["top", "bottom", "middle"],
      default: "middle",
    },
    TextHAlign: {
      type: String,
      enum: ["left", "center", "right"],
      default: "center",
    },
    TextSize: {
      type: String,
      enum: ["small", "regular", "large"],
      default: "regular",
    },
    Silent: {
      type: Boolean,
      default: true,
    },
    isJson: {
      type: Boolean,
      default: false,
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
  { _id: false, timestamps: false }
);
