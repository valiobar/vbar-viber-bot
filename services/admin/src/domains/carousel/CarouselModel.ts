/**
 * Mongoose Carousel Model
 *
 * Defines the MongoDB schema and model for Carousel documents.
 * Carousels store editor Cards plus computed, Viber-shaped Buttons.
 */

import mongoose, { Schema, Model } from "mongoose";
import { createButtonSchema } from "../keyboard/ButtonModel";
import type { CarouselCardDTO } from "./types";

/**
 * Carousel document interface (MongoDB document structure)
 */
export interface ICarouselDocument extends mongoose.Document {
  Type: string;
  humanReadableName: string;
  hidden: boolean;
  BgColor: string | null;
  ButtonsGroupColumns: number;
  ButtonsGroupRows: number;
  Cards: CarouselCardDTO[];
  Buttons: any[]; // computed embedded buttons (Rows up to 7)
  createdAt: Date;
  updatedAt: Date;
}

const carouselButtonSchema = createButtonSchema(7);

const carouselCtaSchema = new Schema(
  {
    text: { type: String, required: true },
    textColor: {
      type: String,
      required: true,
      match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/,
    },
    bgColor: { type: String, default: null },
    actionType: {
      type: String,
      enum: ["reply", "open-url", "none"],
      default: "reply",
    },
    actionBody: { type: String, default: "" },
    openURLType: {
      type: String,
      enum: ["internal", "external"],
      default: "external",
    },
    silent: { type: Boolean, default: false },
  },
  { _id: false }
);

const carouselCardSchema = new Schema(
  {
    mode: { type: String, enum: ["structured", "custom"], required: true },
    image: { type: String, default: null },
    title: { type: String, default: "" },
    titleColor: { type: String, default: "#323232" },
    description: { type: String, default: "" },
    descriptionColor: { type: String, default: "#777777" },
    textRows: { type: Number, min: 1, max: 3, default: 2 },
    ctaButtons: { type: [carouselCtaSchema], default: [] },
    Buttons: { type: [carouselButtonSchema], default: [] },
  },
  { _id: false }
);

const carouselSchema = new Schema<ICarouselDocument>(
  {
    Type: { type: String, default: "rich_media", required: true },
    humanReadableName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    hidden: { type: Boolean, default: false },
    BgColor: {
      type: String,
      default: null,
      validate: {
        validator: (value: string | null) =>
          value === null || /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/.test(value),
        message: "BgColor must be a valid hex color code or null",
      },
    },
    ButtonsGroupColumns: { type: Number, min: 1, max: 6, default: 6 },
    ButtonsGroupRows: { type: Number, min: 1, max: 7, default: 7 },
    Cards: {
      type: [carouselCardSchema],
      required: true,
      validate: {
        validator: (cards: unknown[]) =>
          Array.isArray(cards) && cards.length > 0,
        message: "Cards array is required and must contain at least one card",
      },
    },
    Buttons: { type: [carouselButtonSchema], required: true } as any,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false, collection: "carousels" }
);

carouselSchema.index({ hidden: 1 });
carouselSchema.index({ humanReadableName: 1 });

carouselSchema.pre("save", function () {
  (this as any).updatedAt = new Date();
});

/**
 * Carousel model
 * Uses singleton pattern to prevent model recompilation
 */
let CarouselModel: Model<ICarouselDocument>;
if (mongoose.models.Carousel) {
  CarouselModel = mongoose.models.Carousel as Model<ICarouselDocument>;
} else {
  CarouselModel = mongoose.model<ICarouselDocument>("Carousel", carouselSchema);
}
export { CarouselModel };
