/**
 * MongoDB connection configuration for AI Service using Mongoose
 *
 * Uses singleton pattern to maintain a single connection across requests
 */

import mongoose from "mongoose";
import { ConfigHelper } from "@vbar/shared";

// Build connection URI with authSource to authenticate against 'admin' database
// but use a different database for application data
const defaultUri = `mongodb://ai:ai123@localhost:27019/ai?authSource=admin`;
let uri = ConfigHelper.getEnv("MONGODB_URI", defaultUri);
const dbName = ConfigHelper.getEnv("MONGODB_DB_NAME", "ai");

// Ensure authSource is included if not already present (for custom URIs)
if (uri && !uri.includes("authSource=")) {
  const separator = uri.includes("?") ? "&" : "?";
  uri = `${uri}${separator}authSource=admin`;
}

if (!uri) {
  throw new Error("Please add your Mongo URI to the .env file");
}

/**
 * MongoDB connection state
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const globalForMongoose = global as typeof globalThis & {
  mongoose?: MongooseCache;
};

let cached: MongooseCache = globalForMongoose.mongoose || {
  conn: null,
  promise: null,
};

if (!globalForMongoose.mongoose) {
  globalForMongoose.mongoose = cached;
}

/**
 * Connect to MongoDB using Mongoose
 * Reuses existing connection if available
 */
export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      dbName,
    };

    cached.promise = mongoose.connect(uri, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

/**
 * Get MongoDB database instance (for backward compatibility)
 * @deprecated Use connectToDatabase() and mongoose.connection.db instead
 */
export async function getDatabase() {
  await connectToDatabase();
  return mongoose.connection.db;
}

/**
 * Close MongoDB connection
 */
export async function closeConnection(): Promise<void> {
  if (cached.conn) {
    await mongoose.connection.close();
    cached.conn = null;
    cached.promise = null;
  }
}
