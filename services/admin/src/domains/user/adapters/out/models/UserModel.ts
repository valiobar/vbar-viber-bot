/**
 * Mongoose User Model
 *
 * Defines the MongoDB schema and model for User documents.
 */

import mongoose, { Schema, Model } from "mongoose";
import type { User as UserEntity } from "../../../entities/User";

/**
 * User document interface (MongoDB document structure)
 */
export interface IUserDocument extends mongoose.Document {
  username: string;
  email: string;
  passwordHash: string;
  name: string;
  role: "admin" | "user" | "viewer";
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

/**
 * User schema definition
 */
const userSchema = new Schema<IUserDocument>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      minlength: 3,
      maxlength: 50,
      match: /^[a-z0-9_]+$/, // Only lowercase letters, numbers, and underscores
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      maxlength: 255,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    role: {
      type: String,
      required: true,
      enum: ["admin", "user", "viewer"],
      default: "user",
    },
    lastLoginAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
    collection: "users",
  }
);

/**
 * User model
 * Uses singleton pattern to prevent model recompilation
 */
let UserModel: Model<IUserDocument>;

if (mongoose.models.User) {
  UserModel = mongoose.models.User as Model<IUserDocument>;
} else {
  UserModel = mongoose.model<IUserDocument>("User", userSchema);
}

export { UserModel };
