/**
 * RabbitMQ message queue configuration for Viber Service
 */

import amqp, { Connection, Channel } from "amqplib";
import { ConfigHelper, ServiceConfig } from "@vbar/shared";

let connection: Connection | null = null;
let channel: Channel | null = null;

const uri = ConfigHelper.getEnv("RABBITMQ_URI", "amqp://localhost:5672");
const exchangeName = ServiceConfig.messageQueue.exchanges.default;
const queueName = ServiceConfig.messageQueue.queues.analyticsEvents;

/**
 * Get RabbitMQ connection
 */
export async function getConnection(): Promise<Connection> {
  if (connection) {
    return connection;
  }

  connection = await amqp.connect(uri);
  
  connection.on("error", (err) => {
    console.error("RabbitMQ connection error:", err);
    connection = null;
    channel = null;
  });

  connection.on("close", () => {
    console.log("RabbitMQ connection closed");
    connection = null;
    channel = null;
  });

  return connection;
}

/**
 * Get RabbitMQ channel
 */
export async function getChannel(): Promise<Channel> {
  if (channel) {
    return channel;
  }

  const conn = await getConnection();
  channel = await conn.createChannel();

  // Assert exchange
  await channel.assertExchange(exchangeName, "topic", {
    durable: true,
  });

  // Assert queue
  await channel.assertQueue(queueName, {
    durable: true,
  });

  // Bind queue to exchange
  await channel.bindQueue(queueName, exchangeName, "analytics.*");

  return channel;
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
    await channel.close();
    channel = null;
  }
  if (connection) {
    await connection.close();
    connection = null;
  }
}

