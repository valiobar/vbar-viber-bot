/**
 * MongoDB connection utility for Admin Service using Mongoose
 *
 * Uses singleton pattern to maintain a single connection across requests
 */

import mongoose from "mongoose";
import { ConfigHelper } from "@vbar/shared";

const uri = ConfigHelper.getEnv("MONGODB_URI", "mongodb://localhost:27017");
const dbName = ConfigHelper.getEnv("MONGODB_DB_NAME", "admin");

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
 * Close MongoDB connection
 */
export async function closeConnection(): Promise<void> {
  if (cached.conn) {
    await mongoose.connection.close();
    cached.conn = null;
    cached.promise = null;
  }
}
