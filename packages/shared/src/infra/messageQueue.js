"use strict";
/**
 * Shared RabbitMQ connection/channel helper.
 *
 * Callers pass { uri } — this module does not read process.env.
 * Asserts the default topic exchange; queue assert/bind stays with
 * publishers and consumers.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeQueue = exports.createQueueChannel = void 0;
const amqplib_1 = __importDefault(require("amqplib"));
const config_1 = require("../config");
let connection = null;
let channel = null;
let cachedUri = null;
/**
 * Connect (cached) and return a channel with the default exchange asserted.
 */
const createQueueChannel = async (options) => {
    if (channel && cachedUri === options.uri) {
        return channel;
    }
    cachedUri = options.uri;
    if (!connection) {
        const newConnection = (await amqplib_1.default.connect(options.uri));
        connection = newConnection;
        newConnection.on("error", (err) => {
            console.error("RabbitMQ connection error:", err);
            connection = null;
            channel = null;
        });
        newConnection.on("close", () => {
            console.log("RabbitMQ connection closed");
            connection = null;
            channel = null;
        });
    }
    if (!channel) {
        const newChannel = (await connection.createChannel());
        channel = newChannel;
        await newChannel.assertExchange(config_1.ServiceConfig.messageQueue.exchanges.default, "topic", { durable: true });
    }
    return channel;
};
exports.createQueueChannel = createQueueChannel;
const closeQueue = async () => {
    if (channel) {
        try {
            await channel.close();
        }
        catch (error) {
            console.error("Error closing channel:", error);
        }
        channel = null;
    }
    if (connection) {
        try {
            await connection.close();
        }
        catch (error) {
            console.error("Error closing connection:", error);
        }
        connection = null;
    }
    cachedUri = null;
};
exports.closeQueue = closeQueue;
//# sourceMappingURL=messageQueue.js.map