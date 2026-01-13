/**
 * Message Queue Publisher
 *
 * RabbitMQ publisher for sending refresh events to viber service instances.
 * Uses fire-and-forget pattern to avoid blocking admin service operations.
 *
 * Location: Infrastructure/Output Adapter
 */

import amqp, { Connection, Channel } from "amqplib";
import { ConfigHelper, ServiceConfig } from "@vbar/shared";
import type { RefreshEvent } from "@vbar/shared";

let connection: Connection | null = null;
let channel: Channel | null = null;

const uri = ConfigHelper.getEnv(
  "RABBITMQ_URI",
  "amqp://admin:admin@localhost:5672"
);
const exchangeName = ServiceConfig.messageQueue.exchanges.default;
const queueName = ServiceConfig.messageQueue.queues.viberRefresh;

/**
 * Get RabbitMQ connection
 */
async function getConnection(): Promise<Connection> {
  if (connection) {
    return connection;
  }

  const newConnection = (await amqp.connect(uri)) as unknown as Connection;
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

  return newConnection;
}

/**
 * Get RabbitMQ channel
 */
async function getChannel(): Promise<Channel> {
  if (channel) {
    return channel;
  }

  const conn = await getConnection();
  const newChannel = (await (conn as any).createChannel()) as Channel;
  channel = newChannel;

  // Assert exchange
  await newChannel.assertExchange(exchangeName, "topic", {
    durable: true,
  });

  // Assert queue
  await newChannel.assertQueue(queueName, {
    durable: true,
  });

  // Bind queue to exchange
  await newChannel.bindQueue(queueName, exchangeName, "viber.refresh");

  return newChannel;
}

/**
 * Publish refresh event to RabbitMQ
 *
 * Fire-and-forget pattern - doesn't await, just logs errors
 */
export async function publishRefreshEvent(
  dataType?: "all" | "steps" | "messages" | "keyboards" | "bot_settings"
): Promise<void> {
  // Fire-and-forget: don't await, just log errors
  (async () => {
    try {
      const ch = await getChannel();
      const event: RefreshEvent = {
        type: "bot_data_refresh",
        timestamp: new Date().toISOString(),
        source: "admin_service",
        dataType: dataType || "all",
      };

      const messageBuffer = Buffer.from(JSON.stringify(event));

      const published = ch.publish(
        exchangeName,
        "viber.refresh",
        messageBuffer,
        {
          persistent: true,
        }
      );

      if (!published) {
        console.warn("Failed to publish refresh event (buffer full)");
      } else {
        console.log(`Published refresh event: ${event.dataType}`);
      }
    } catch (error) {
      // Log error but don't throw - this is fire-and-forget
      console.error("Error publishing refresh event:", error);
    }
  })();
}

/**
 * Close RabbitMQ connection
 */
export async function closeMessageQueue(): Promise<void> {
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
      await (connection as any).close();
    } catch (error) {
      console.error("Error closing connection:", error);
    }
    connection = null;
  }
}
