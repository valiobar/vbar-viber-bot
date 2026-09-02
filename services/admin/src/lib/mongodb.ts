/**
 * MongoDB connection utility for Admin Service using Mongoose
 *
 * Uses singleton pattern to maintain a single connection across requests
 */

import mongoose from "mongoose";
import { ConfigHelper } from "@vbar/shared";
import { seedAdminUser } from "./seed";
// Import models to ensure they're registered
import { UserModel } from "@/domains/user/UserModel";
import { SessionModel } from "@/domains/user/SessionModel";
import { KeyboardModel } from "@/domains/keyboard/KeyboardModel";

// Default database name - using 'admin_service' to avoid conflicts with MongoDB's 'admin' auth database
const dbName = ConfigHelper.getEnv("MONGODB_DB_NAME", "admin_service");

/**
 * Resolve MONGODB_URI at runtime (not module load) so Next.js build-time
 * imports succeed without the env var set. Fail fast on first DB use.
 */
function resolveMongoUri(): string {
  const rawUri = process.env.MONGODB_URI;
  if (!rawUri) {
    throw new Error(
      "MONGODB_URI is required but not set. Add it to the environment or .env file."
    );
  }

  // Authenticate against 'admin' when URI lacks authSource (custom/local URIs)
  if (!rawUri.includes("authSource=")) {
    const separator = rawUri.includes("?") ? "&" : "?";
    return `${rawUri}${separator}authSource=admin`;
  }

  return rawUri;
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
  seeded?: boolean;
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
    console.log("Using existing MongoDB connection");
    // Check if seeding is needed even with existing connection
    if (!globalForMongoose.seeded) {
      globalForMongoose.seeded = true;
      console.log("Starting database seeding process (existing connection)...");
      seedAdminUser()
        .then(() => {
          console.log("✅ Database seeding completed successfully");
        })
        .catch((error) => {
          console.error("❌ Failed to seed admin user:", error);
          if (error instanceof Error) {
            console.error("Error message:", error.message);
            console.error("Error stack:", error.stack);
          }
        });
    }
    return cached.conn;
  }

  if (!cached.promise) {
    console.log("Creating new MongoDB connection...");
    const uri = resolveMongoUri();
    const opts = {
      bufferCommands: false,
      dbName,
    };

    cached.promise = mongoose.connect(uri, opts).then(async (mongoose) => {
      console.log("MongoDB connection established");

      // Ensure indexes are created from model definitions
      // This ensures indexes exist even if models haven't been used yet
      try {
        await UserModel.ensureIndexes();
        await SessionModel.ensureIndexes();
        await KeyboardModel.ensureIndexes();
        console.log("✅ Database indexes verified/created");
      } catch (error) {
        console.error("⚠️  Failed to ensure database indexes:", error);
        // Don't throw - indexes might already exist
      }

      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
    console.log(
      "MongoDB connection ready, seeded flag:",
      globalForMongoose.seeded
    );

    // Seed admin user on first connection (only once)
    if (!globalForMongoose.seeded) {
      globalForMongoose.seeded = true;
      console.log("Starting database seeding process...");
      // Run seeding asynchronously without blocking the connection
      // But ensure it completes to create collections
      seedAdminUser()
        .then(() => {
          console.log("✅ Database seeding completed successfully");
        })
        .catch((error) => {
          console.error("❌ Failed to seed admin user:", error);
          if (error instanceof Error) {
            console.error("Error message:", error.message);
            console.error("Error stack:", error.stack);
          }
        });
    } else {
      console.log("Database already seeded, skipping...");
    }
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
