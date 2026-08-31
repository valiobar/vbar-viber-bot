/**
 * ViberUser Mongoose Model
 *
 * Mongoose schema and model for ViberUser persistence in MongoDB.
 * This is an infrastructure adapter following Hexagonal Architecture principles.
 */

import mongoose, { Schema, Model } from "mongoose";

/**
 * Mongoose document interface for ViberUser
 */
export interface IViberUserDocument extends mongoose.Document {
  viberId: string;
  name: string;
  avatar?: string;
  language?: string;
  country?: string;
  apiVersion?: number;
  subscribed: boolean;
  subscribedAt?: Date;
  unsubscribedAt?: Date;
  currentStepId?: string;
  state?: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ViberUser Mongoose Schema
 */
const viberUserSchema = new Schema<IViberUserDocument>(
  {
    viberId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
    },
    language: {
      type: String,
    },
    country: {
      type: String,
    },
    apiVersion: {
      type: Number,
    },
    subscribed: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    subscribedAt: {
      type: Date,
    },
    unsubscribedAt: {
      type: Date,
    },
    currentStepId: {
      type: String,
      index: true,
    },
    state: {
      type: Schema.Types.Mixed,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

/**
 * ViberUser Mongoose Model
 */
export const ViberUserModel: Model<IViberUserDocument> =
  mongoose.model<IViberUserDocument>("ViberUser", viberUserSchema);
