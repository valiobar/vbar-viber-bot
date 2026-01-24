/**
 * RabbitMQ message queue configuration for Web3 Service
 */

import amqp, { Connection, Channel } from "amqplib";
import { ConfigHelper, ServiceConfig } from "@vbar/shared";

let connection: Connection | null = null;
let channel: Channel | null = null;

const uri = ConfigHelper.getEnv(
  "RABBITMQ_URL",
  ConfigHelper.getEnv("RABBITMQ_URI", "amqp://admin:admin@localhost:5672")
);
const exchangeName = ServiceConfig.messageQueue.exchanges.default;

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
 * Consume messages from queue
 */
export async function consumeMessages(
  queueName: string,
  routingKey: string,
  onMessage: (message: any) => Promise<void>
): Promise<void> {
  try {
    const ch = await getChannel();

    // Assert queue
    await ch.assertQueue(queueName, {
      durable: true,
    });

    // Bind queue to exchange
    await ch.bindQueue(queueName, exchangeName, routingKey);

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

