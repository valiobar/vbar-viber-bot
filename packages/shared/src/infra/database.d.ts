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
/**
 * Connect to MongoDB using a process-wide cached mongoose singleton.
 */
export declare const createMongoConnection: (options: MongoConnectionOptions) => Promise<typeof mongoose>;
/**
 * Returns the native Mongo db handle. Connects using the options from the
 * last `createMongoConnection` call (no env reads here).
 */
export declare const getMongoDatabase: () => Promise<mongoose.mongo.Db | undefined>;
export declare const closeMongoConnection: () => Promise<void>;
//# sourceMappingURL=database.d.ts.map