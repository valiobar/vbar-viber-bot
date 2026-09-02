/**
 * Refresh Consumer
 *
 * RabbitMQ consumer that subscribes to refresh events and triggers
 * cache refresh in the viber service. This ensures all instances
 * stay synchronized when bot data changes.
 *
 * Location: Input Adapter (Hexagonal Architecture)
 */

import { Channel, Message } from "amqplib";
import { ConfigHelper, ServiceConfig, RefreshEvent } from "@vbar/shared";
import { createQueueChannel } from "@vbar/shared/infra";
import { ViberBotService } from "../../../application/services/ViberBotService";

export class RefreshConsumer {
  private channel: Channel | null = null;
  private viberBotService: ViberBotService;
  private queueName: string;
  private exchangeName: string;
  private isConsuming: boolean = false;

  constructor(viberBotService: ViberBotService) {
    this.viberBotService = viberBotService;
    this.queueName = ServiceConfig.messageQueue.queues.viberRefresh;
    this.exchangeName = ServiceConfig.messageQueue.exchanges.default;
  }

  /**
   * Start consuming refresh events
   */
  async start(): Promise<void> {
    if (this.isConsuming) {
      console.log("Refresh consumer already started");
      return;
    }

    try {
      // Ensure connection and channel
      const channel = await createQueueChannel({
        uri: ConfigHelper.getEnv(
          "RABBITMQ_URI",
          "amqp://admin:admin@localhost:5672"
        ),
      });
      this.channel = channel;

      // Assert queue (durable, so it survives RabbitMQ restarts)
      await channel.assertQueue(this.queueName, {
        durable: true,
      });

      // Bind queue to exchange with routing key
      await channel.bindQueue(
        this.queueName,
        this.exchangeName,
        "viber.refresh"
      );

      this.isConsuming = true;
      await channel.consume(
        this.queueName,
        async (message) => {
          if (!message) {
            return;
          }

          try {
            const event: RefreshEvent = JSON.parse(message.content.toString());

            console.log("Received refresh event:", event);

            await this.handleRefresh(event);

            this.safeAck(message);
          } catch (error) {
            console.error("Error processing refresh event:", error);
            this.safeNack(message, this.isTransientError(error));
          }
        },
        {
          noAck: false, // Manual acknowledgment
        }
      );

      console.log(
        `Refresh consumer started, listening on queue: ${this.queueName}`
      );
    } catch (error) {
      this.isConsuming = false;
      this.channel = null;
      console.error("Failed to start refresh consumer:", error);
      throw error;
    }
  }

  /**
   * Handle refresh event
   */
  private async handleRefresh(event: RefreshEvent): Promise<void> {
    try {
      const botDataService = this.viberBotService.getBotDataService();

      // Refresh all data in parallel
      await Promise.all([
        botDataService.refreshAllData(),
        this.viberBotService.refreshSettings().catch((error) => {
          const message =
            error instanceof Error ? error.message : String(error);
          if (/not found/i.test(message)) {
            console.warn(
              "Bot settings not configured yet; content cache refreshed without settings"
            );
            return;
          }
          throw error;
        }),
      ]);

      console.log("Cache refreshed successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Failed to refresh cache:", errorMessage);
      throw error;
    }
  }

  /**
   * Auth / config failures will not succeed on retry — do not requeue.
   * Network blips can be requeued.
   */
  private isTransientError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    if (/authentication failed|invalid service token/i.test(message)) {
      return false;
    }
    return /timeout|ECONNRESET|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|network|fetch failed/i.test(
      message
    );
  }

  private safeAck(message: Message): void {
    try {
      this.channel?.ack(message);
    } catch (error) {
      console.error("Failed to ack refresh event:", error);
    }
  }

  private safeNack(message: Message, requeue: boolean): void {
    try {
      this.channel?.nack(message, false, requeue);
    } catch (error) {
      console.error("Failed to nack refresh event:", error);
    }
  }

  /**
   * Stop consuming messages
   */
  async stop(): Promise<void> {
    if (this.channel && this.isConsuming) {
      this.isConsuming = false;
      try {
        await this.channel.cancel(this.queueName);
        console.log("Refresh consumer stopped");
      } catch (error) {
        console.error("Error stopping refresh consumer:", error);
      }
    }
  }
}
