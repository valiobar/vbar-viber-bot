/**
 * Shared mongoose connection helper.
 *
 * Callers pass { uri, dbName } — this module does not read process.env
 * (ConfigHelper remains the single env reader).
 */

import mongoose from "mongoose";

export interface MongoConnectionOptions {
  uri: string;
  dbName: string;
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const globalForMongoose = globalThis as typeof globalThis & {
  vbarMongoose?: MongooseCache;
};

const cached: MongooseCache = globalForMongoose.vbarMongoose ?? {
  conn: null,
  promise: null,
};

if (!globalForMongoose.vbarMongoose) {
  globalForMongoose.vbarMongoose = cached;
}

let lastOptions: MongoConnectionOptions | null = null;

const normalizeAuthSource = (uri: string): string => {
  if (uri.includes("authSource=")) {
    return uri;
  }
  const separator = uri.includes("?") ? "&" : "?";
  return `${uri}${separator}authSource=admin`;
};

/**
 * Connect to MongoDB using a process-wide cached mongoose singleton.
 */
export const createMongoConnection = async (
  options: MongoConnectionOptions
): Promise<typeof mongoose> => {
  if (!options.uri) {
    throw new Error("Please add your Mongo URI to the .env file");
  }

  lastOptions = options;

  if (cached.conn) {
    return cached.conn;
  }

  const uri = normalizeAuthSource(options.uri);

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      bufferCommands: false,
      dbName: options.dbName,
    } as mongoose.ConnectOptions);
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  return cached.conn;
};

/**
 * Returns the native Mongo db handle. Connects using the options from the
 * last `createMongoConnection` call (no env reads here).
 */
export const getMongoDatabase = async () => {
  if (!lastOptions) {
    throw new Error(
      "Mongo not connected; call createMongoConnection first"
    );
  }
  await createMongoConnection(lastOptions);
  return mongoose.connection.db;
};

export const closeMongoConnection = async (): Promise<void> => {
  if (cached.conn) {
    await mongoose.connection.close();
    cached.conn = null;
    cached.promise = null;
  }
  lastOptions = null;
};
