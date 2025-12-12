/**
 * RabbitMQ message queue configuration for Analytics Service
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

  // Assert queue for analytics events
  await channel.assertQueue(queueName, {
    durable: true,
  });

  // Bind queue to exchange for analytics events
  await channel.bindQueue(queueName, exchangeName, "analytics.event");
  await channel.bindQueue(queueName, exchangeName, "analytics.message.received");
  await channel.bindQueue(queueName, exchangeName, "analytics.message.sent");
  await channel.bindQueue(queueName, exchangeName, "analytics.user.action");
  await channel.bindQueue(queueName, exchangeName, "analytics.bot.interaction");

  return channel;
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
    await channel.close();
    channel = null;
  }
  if (connection) {
    await connection.close();
    connection = null;
  }
}

