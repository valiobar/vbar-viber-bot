/**
 * Refresh Consumer
 *
 * RabbitMQ consumer that subscribes to refresh events and triggers
 * cache refresh in the viber service. This ensures all instances
 * stay synchronized when bot data changes.
 *
 * Location: Input Adapter (Hexagonal Architecture)
 */

import { Channel } from "amqplib";
import { ServiceConfig, RefreshEvent } from "@vbar/shared";
import { getConnection, getChannel } from "../../../config/messageQueue";
import { ViberBotService } from "../../../application/services/ViberBotService";

export class RefreshConsumer {
  private channel: Channel | null = null;
  private viberBotService: ViberBotService;
  private queueName: string;
  private exchangeName: string;
  private isConsuming: boolean = false;

  constructor(viberBotService: ViberBotService) {
    this.viberBotService = viberBotService;
    // Use queue name from ServiceConfig, fallback to string literal if type doesn't include it yet
    this.queueName =
      (ServiceConfig.messageQueue.queues as any).viberRefresh ||
      "viber.refresh";
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
      await getConnection();
      const channel = await getChannel();
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

      // Start consuming messages
      await channel.consume(
        this.queueName,
        async (message) => {
          if (!message) {
            return;
          }

          try {
            // Parse message
            const event: RefreshEvent = JSON.parse(message.content.toString());

            console.log("Received refresh event:", event);

            // Refresh all data
            await this.handleRefresh(event);

            // Acknowledge message
            if (this.channel) {
              this.channel.ack(message);
            }
          } catch (error) {
            console.error("Error processing refresh event:", error);
            // Nack message (requeue for transient errors)
            const requeue =
              error instanceof Error && !error.message.includes("permanent");
            if (this.channel) {
              this.channel.nack(message, false, requeue);
            }
          }
        },
        {
          noAck: false, // Manual acknowledgment
        }
      );

      this.isConsuming = true;
      console.log(
        `Refresh consumer started, listening on queue: ${this.queueName}`
      );
    } catch (error) {
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
        this.viberBotService.refreshSettings(),
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
   * Stop consuming messages
   */
  async stop(): Promise<void> {
    if (this.channel && this.isConsuming) {
      try {
        await this.channel.cancel(this.queueName);
        this.isConsuming = false;
        console.log("Refresh consumer stopped");
      } catch (error) {
        console.error("Error stopping refresh consumer:", error);
      }
    }
  }
}
