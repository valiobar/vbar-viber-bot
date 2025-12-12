/**
 * MongoDB connection utility for Admin Service
 * 
 * Uses singleton pattern to maintain a single connection across requests
 */

import { MongoClient, Db } from "mongodb";
import { ConfigHelper } from "@vbar/shared";

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

const uri = ConfigHelper.getEnv("MONGODB_URI", "mongodb://localhost:27017");
const dbName = ConfigHelper.getEnv("MONGODB_DB_NAME", "admin");

if (!uri) {
  throw new Error("Please add your Mongo URI to the .env file");
}

/**
 * Get MongoDB client instance
 * Reuses existing connection if available
 */
export async function getMongoClient(): Promise<MongoClient> {
  if (clientPromise) {
    return clientPromise;
  }

  if (process.env.NODE_ENV === "development") {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    const globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      client = new MongoClient(uri);
      globalWithMongo._mongoClientPromise = client.connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
  } else {
    // In production mode, it's best to not use a global variable.
    client = new MongoClient(uri);
    clientPromise = client.connect();
  }

  return clientPromise;
}

/**
 * Get MongoDB database instance
 */
export async function getDatabase(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(dbName);
}

/**
 * Close MongoDB connection
 */
export async function closeConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    clientPromise = null;
  }
}

