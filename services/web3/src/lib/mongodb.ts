/**
 * MongoDB connection utility for Web3 Service using Mongoose
 *
 * Uses singleton pattern to maintain a single connection across requests
 */

import mongoose from "mongoose";
import { ConfigHelper } from "@vbar/shared";

// Default database name
const dbName = ConfigHelper.getEnv("MONGODB_DB_NAME", "web3_service");

// Build connection URI with authSource to authenticate against 'admin' database
// but use a different database for application data
const defaultUri = `mongodb://admin:admin123@localhost:27017/${dbName}?authSource=admin`;
let uri = ConfigHelper.getEnv("MONGODB_URI", defaultUri);

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

    cached.promise = mongoose.connect(uri, opts).then(async (mongoose) => {
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
 * Close MongoDB connection
 */
export async function closeConnection(): Promise<void> {
  if (cached.conn) {
    await mongoose.connection.close();
    cached.conn = null;
    cached.promise = null;
  }
}

