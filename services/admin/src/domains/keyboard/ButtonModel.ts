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
  ButtonFrame,
} from "./types";

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
  Frame?: ButtonFrame | null;
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
 * Viber API level 6 button frame subdocument.
 * Product default when enabled is BorderWidth 1 / CornerRadius 10;
 * schema defaults match Viber API (BorderWidth 1, CornerRadius 0).
 */
export const createFrameSchema = () =>
  new Schema(
    {
      BorderWidth: { type: Number, min: 0, max: 10, default: 1 },
      BorderColor: {
        type: String,
        validate: {
          validator: (value: string) =>
            /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/.test(value),
          message: "Frame.BorderColor must be a valid hex color code",
        },
      },
      CornerRadius: { type: Number, min: 0, max: 10, default: 0 },
    },
    { _id: false }
  );

/**
 * Creates the embedded Button schema. Keyboards cap Rows at 2,
 * rich-media carousels allow up to 7 (Viber API).
 *
 * Note: Pre-save hooks don't work on embedded subdocuments in Mongoose.
 * Button text formatting is handled in KeyboardModel's pre-save hook.
 *
 * Note: Schema is not typed with generic to avoid TypeScript issues when used in arrays.
 */
export const createButtonSchema = (maxRows: number) =>
  new Schema(
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
        max: maxRows,
        default: 1,
      },
      Text: {
        // Optional: Viber allows buttons without text (e.g. image-only buttons).
        // Note: `required: true` on a Mongoose String rejects "" — do not add it back.
        type: String,
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
      Frame: {
        type: createFrameSchema(),
        required: false,
        default: null,
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

export const buttonSchema = createButtonSchema(2);
