/**
 * Mongoose Session Model
 *
 * Defines the MongoDB schema and model for Session documents.
 * Includes TTL index for automatic cleanup of expired sessions.
 */

import mongoose, { Schema, Model } from "mongoose";

/**
 * Session document interface (MongoDB document structure)
 */
export interface ISessionDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  refreshToken: string;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * Session schema definition
 */
const sessionSchema = new Schema<ISessionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
      index: true,
    },
    refreshToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // TTL index for automatic cleanup
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
    collection: "sessions",
  }
);

/**
 * Session model
 * Uses singleton pattern to prevent model recompilation
 */
let SessionModel: Model<ISessionDocument>;

if (mongoose.models.Session) {
  SessionModel = mongoose.models.Session as Model<ISessionDocument>;
} else {
  SessionModel = mongoose.model<ISessionDocument>("Session", sessionSchema);
}

export { SessionModel };
