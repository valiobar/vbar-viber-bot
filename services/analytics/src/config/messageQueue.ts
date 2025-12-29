/**
 * RabbitMQ message queue configuration for Analytics Service
 */

// Type declaration for Node.js globals
declare const console: {
  log(...args: any[]): void;
  error(...args: any[]): void;
  warn(...args: any[]): void;
};

import amqp, { Connection, Channel } from "amqplib";
import { ConfigHelper, ServiceConfig } from "@vbar/shared";

let connection: Connection | null = null;
let channel: Channel | null = null;

const uri = ConfigHelper.getEnv(
  "RABBITMQ_URI",
  "amqp://admin:admin@localhost:5672"
);
const exchangeName = ServiceConfig.messageQueue.exchanges.default;
const queueName = ServiceConfig.messageQueue.queues.analyticsEvents;

/**
 * Get RabbitMQ connection
 */
export async function getConnection(): Promise<Connection> {
  if (connection) {
    return connection;
  }

  const newConnection = (await amqp.connect(uri)) as unknown as Connection;
  connection = newConnection;

  (newConnection as any).on("error", (err: any) => {
    console.error("RabbitMQ connection error:", err);
    connection = null;
    channel = null;
  });

  (newConnection as any).on("close", () => {
    console.log("RabbitMQ connection closed");
    connection = null;
    channel = null;
  });

  return newConnection;
}

/**
 * Get RabbitMQ channel
 */
export async function getChannel(): Promise<Channel> {
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

  // Assert queue for analytics events
  await newChannel.assertQueue(queueName, {
    durable: true,
  });

  // Bind queue to exchange for analytics events
  await newChannel.bindQueue(queueName, exchangeName, "analytics.event");
  await newChannel.bindQueue(
    queueName,
    exchangeName,
    "analytics.message.received"
  );
  await newChannel.bindQueue(queueName, exchangeName, "analytics.message.sent");
  await newChannel.bindQueue(queueName, exchangeName, "analytics.user.action");
  await newChannel.bindQueue(
    queueName,
    exchangeName,
    "analytics.bot.interaction"
  );

  return newChannel;
}

/**
 * Consume messages from analytics events queue
 */
export async function consumeMessages(
  onMessage: (message: any) => Promise<void>
): Promise<void> {
  try {
    const ch = await getChannel();

    // Consume messages
    await ch.consume(queueName, async (msg) => {
      if (!msg) {
        return;
      }

      try {
        const content = JSON.parse(msg.content.toString());
        await onMessage(content);
        ch.ack(msg);
      } catch (error) {
        console.error("Error processing message:", error);
        ch.nack(msg, false, false);
      }
    });

    console.log(`Consuming messages from queue: ${queueName}`);
  } catch (error) {
    console.error("Error consuming messages:", error);
    throw error;
  }
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
