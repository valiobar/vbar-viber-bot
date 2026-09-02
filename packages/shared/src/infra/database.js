"use strict";
/**
 * Shared mongoose connection helper.
 *
 * Callers pass { uri, dbName } — this module does not read process.env
 * (ConfigHelper remains the single env reader).
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeMongoConnection = exports.getMongoDatabase = exports.createMongoConnection = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const globalForMongoose = globalThis;
const cached = globalForMongoose.vbarMongoose ?? {
    conn: null,
    promise: null,
};
if (!globalForMongoose.vbarMongoose) {
    globalForMongoose.vbarMongoose = cached;
}
let lastOptions = null;
const normalizeAuthSource = (uri) => {
    if (uri.includes("authSource=")) {
        return uri;
    }
    const separator = uri.includes("?") ? "&" : "?";
    return `${uri}${separator}authSource=admin`;
};
/**
 * Connect to MongoDB using a process-wide cached mongoose singleton.
 */
const createMongoConnection = async (options) => {
    if (!options.uri) {
        throw new Error("Please add your Mongo URI to the .env file");
    }
    lastOptions = options;
    if (cached.conn) {
        return cached.conn;
    }
    const uri = normalizeAuthSource(options.uri);
    if (!cached.promise) {
        cached.promise = mongoose_1.default.connect(uri, {
            bufferCommands: false,
            dbName: options.dbName,
        });
    }
    try {
        cached.conn = await cached.promise;
    }
    catch (error) {
        cached.promise = null;
        throw error;
    }
    return cached.conn;
};
exports.createMongoConnection = createMongoConnection;
/**
 * Returns the native Mongo db handle. Connects using the options from the
 * last `createMongoConnection` call (no env reads here).
 */
const getMongoDatabase = async () => {
    if (!lastOptions) {
        throw new Error("Mongo not connected; call createMongoConnection first");
    }
    await (0, exports.createMongoConnection)(lastOptions);
    return mongoose_1.default.connection.db;
};
exports.getMongoDatabase = getMongoDatabase;
const closeMongoConnection = async () => {
    if (cached.conn) {
        await mongoose_1.default.connection.close();
        cached.conn = null;
        cached.promise = null;
    }
    lastOptions = null;
};
exports.closeMongoConnection = closeMongoConnection;
//# sourceMappingURL=database.js.map