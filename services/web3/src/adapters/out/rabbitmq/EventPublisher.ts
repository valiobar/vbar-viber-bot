/**
 * RabbitMQ Event Publisher Adapter
 *
 * Output adapter for publishing domain events to RabbitMQ.
 * Implements the EventPublisher port interface.
 *
 * Location: Infrastructure/Output Adapter
 */

import amqp, { Connection, Channel } from "amqplib";
import { ConfigHelper, ServiceConfig, type Logger } from "@vbar/shared";
import type {
  EventPublisher,
  WalletCreatedEvent,
  TransactionSentEvent,
  TransactionConfirmedEvent,
  TokenTransferredEvent,
} from "../../../ports/out/EventPublisher";

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

  // Bind queue to exchange for web3 events
  await newChannel.bindQueue(queueName, exchangeName, "web3.*");

  return newChannel;
}

/**
 * RabbitMQ Event Publisher Implementation
 *
 * Publishes domain events to RabbitMQ for analytics processing.
 */
export class RabbitMQEventPublisher implements EventPublisher {
  private readonly logger: Logger;

  /**
   * Creates a new RabbitMQEventPublisher instance
   *
   * @param logger - Logger instance for logging
   */
  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Publish wallet created event
   *
   * @param event - Wallet created event data
   * @returns Promise that resolves when event is published
   */
  async publishWalletCreated(event: WalletCreatedEvent): Promise<void> {
    try {
      const ch = await getChannel();
      const message = {
        event: "web3.wallet.created",
        timestamp: event.timestamp,
        type: "wallet",
        walletId: event.walletId,
        viberUserId: event.viberUserId,
        address: event.address,
        network: event.network,
        properties: {},
        metadata: {
          source: "web3",
        },
      };

      const messageBuffer = Buffer.from(JSON.stringify(message));

      const published = ch.publish(
        exchangeName,
        "web3.wallet.created",
        messageBuffer,
        {
          persistent: true,
        }
      );

      if (!published) {
        this.logger.warn("Failed to publish wallet.created event (buffer full)", {
          walletId: event.walletId,
        });
      } else {
        this.logger.info("Published wallet.created event", {
          walletId: event.walletId,
        });
      }
    } catch (error) {
      this.logger.error("Error publishing wallet.created event", {
        error: error instanceof Error ? error.message : String(error),
        walletId: event.walletId,
      });
      throw error;
    }
  }

  /**
   * Publish transaction sent event
   *
   * @param event - Transaction sent event data
   * @returns Promise that resolves when event is published
   */
  async publishTransactionSent(event: TransactionSentEvent): Promise<void> {
    try {
      const ch = await getChannel();
      const message = {
        event: "web3.transaction.sent",
        timestamp: event.timestamp,
        type: "transaction",
        walletId: event.walletId,
        viberUserId: "", // Will be populated from wallet if needed
        txHash: event.txHash,
        network: event.network,
        from: event.from,
        to: event.to,
        value: event.value,
        properties: {},
        metadata: {
          source: "web3",
          transactionType: "native",
        },
      };

      const messageBuffer = Buffer.from(JSON.stringify(message));

      const published = ch.publish(
        exchangeName,
        "web3.transaction.sent",
        messageBuffer,
        {
          persistent: true,
        }
      );

      if (!published) {
        this.logger.warn("Failed to publish transaction.sent event (buffer full)", {
          txHash: event.txHash,
        });
      } else {
        this.logger.info("Published transaction.sent event", {
          txHash: event.txHash,
        });
      }
    } catch (error) {
      this.logger.error("Error publishing transaction.sent event", {
        error: error instanceof Error ? error.message : String(error),
        txHash: event.txHash,
      });
      throw error;
    }
  }

  /**
   * Publish transaction confirmed event
   *
   * @param event - Transaction confirmed event data
   * @returns Promise that resolves when event is published
   */
  async publishTransactionConfirmed(
    event: TransactionConfirmedEvent
  ): Promise<void> {
    try {
      const ch = await getChannel();
      const message = {
        event: "web3.transaction.confirmed",
        timestamp: event.timestamp,
        type: "transaction",
        walletId: event.walletId,
        viberUserId: "", // Will be populated from wallet if needed
        txHash: event.txHash,
        network: event.network,
        from: "", // Will be populated from transaction if needed
        to: "", // Will be populated from transaction if needed
        value: "", // Will be populated from transaction if needed
        confirmations: event.confirmations,
        blockNumber: event.blockNumber,
        blockHash: "", // Will be populated from transaction if needed
        properties: {
          status: "success",
        },
        metadata: {
          source: "web3",
          transactionType: "native",
        },
      };

      const messageBuffer = Buffer.from(JSON.stringify(message));

      const published = ch.publish(
        exchangeName,
        "web3.transaction.confirmed",
        messageBuffer,
        {
          persistent: true,
        }
      );

      if (!published) {
        this.logger.warn(
          "Failed to publish transaction.confirmed event (buffer full)",
          {
            txHash: event.txHash,
          }
        );
      } else {
        this.logger.info("Published transaction.confirmed event", {
          txHash: event.txHash,
        });
      }
    } catch (error) {
      this.logger.error("Error publishing transaction.confirmed event", {
        error: error instanceof Error ? error.message : String(error),
        txHash: event.txHash,
      });
      throw error;
    }
  }

  /**
   * Publish token transferred event
   *
   * @param event - Token transferred event data
   * @returns Promise that resolves when event is published
   */
  async publishTokenTransferred(event: TokenTransferredEvent): Promise<void> {
    try {
      const ch = await getChannel();
      const message = {
        event: "web3.token.transferred",
        timestamp: event.timestamp,
        type: "token",
        walletId: event.walletId,
        viberUserId: "", // Will be populated from wallet if needed
        txHash: event.txHash,
        network: event.network,
        tokenAddress: event.tokenAddress,
        from: event.from,
        to: event.to,
        value: event.amount,
        properties: {
          tokenSymbol: "", // Will be populated from token info if needed
          tokenName: "", // Will be populated from token info if needed
          decimals: 18, // Default, will be populated from token info if needed
        },
        metadata: {
          source: "web3",
          tokenType: "ERC20",
        },
      };

      const messageBuffer = Buffer.from(JSON.stringify(message));

      const published = ch.publish(
        exchangeName,
        "web3.token.transferred",
        messageBuffer,
        {
          persistent: true,
        }
      );

      if (!published) {
        this.logger.warn("Failed to publish token.transferred event (buffer full)", {
          txHash: event.txHash,
        });
      } else {
        this.logger.info("Published token.transferred event", {
          txHash: event.txHash,
        });
      }
    } catch (error) {
      this.logger.error("Error publishing token.transferred event", {
        error: error instanceof Error ? error.message : String(error),
        txHash: event.txHash,
      });
      throw error;
    }
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

