/**
 * RabbitMQ message queue configuration for Viber Service
 */

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

  // Assert queue
  await newChannel.assertQueue(queueName, {
    durable: true,
  });

  // Bind queue to exchange
  await newChannel.bindQueue(queueName, exchangeName, "analytics.*");

  return newChannel;
}

/**
 * Publish message to queue
 */
export async function publishMessage(
  routingKey: string,
  message: any
): Promise<boolean> {
  try {
    const ch = await getChannel();
    const messageBuffer = Buffer.from(JSON.stringify(message));

    return ch.publish(exchangeName, routingKey, messageBuffer, {
      persistent: true,
    });
  } catch (error) {
    console.error("Error publishing message:", error);
    return false;
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
