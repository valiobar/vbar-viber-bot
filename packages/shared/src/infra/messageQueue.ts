/**
 * Shared RabbitMQ connection/channel helper.
 *
 * Callers pass { uri } — this module does not read process.env.
 * Asserts the default topic exchange; queue assert/bind stays with
 * publishers and consumers.
 */

import amqp from "amqplib";
import type { Channel, Connection } from "amqplib";
import { ServiceConfig } from "../config";

export interface QueueChannelOptions {
  uri: string;
}

let connection: Connection | null = null;
let channel: Channel | null = null;
let cachedUri: string | null = null;

/**
 * Connect (cached) and return a channel with the default exchange asserted.
 */
export const createQueueChannel = async (
  options: QueueChannelOptions
): Promise<Channel> => {
  if (channel && cachedUri === options.uri) {
    return channel;
  }

  cachedUri = options.uri;

  if (!connection) {
    const newConnection = (await amqp.connect(
      options.uri
    )) as unknown as Connection;
    connection = newConnection;

    newConnection.on("error", (err: Error) => {
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
    const newChannel = (await (connection as unknown as {
      createChannel: () => Promise<Channel>;
    }).createChannel()) as Channel;
    channel = newChannel;

    await newChannel.assertExchange(
      ServiceConfig.messageQueue.exchanges.default,
      "topic",
      { durable: true }
    );
  }

  return channel;
};

export const closeQueue = async (): Promise<void> => {
  if (channel) {
    try {
      await channel.close();
    } catch (error) {
      console.error("Error closing channel:", error);
    }
    channel = null;
  }
  if (connection) {
    try {
      await (
        connection as unknown as { close: () => Promise<void> }
      ).close();
    } catch (error) {
      console.error("Error closing connection:", error);
    }
    connection = null;
  }
  cachedUri = null;
};
