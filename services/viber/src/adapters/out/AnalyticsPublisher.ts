/**
 * Analytics Publisher
 *
 * Fire-and-forget RabbitMQ publisher for step usage analytics events.
 * Mirrors admin's message-queue-publisher pattern (never blocks callers).
 *
 * Location: Output Adapter (Hexagonal Architecture)
 */

import { ConfigHelper, ServiceConfig, Logger, ConsoleLogger } from "@vbar/shared";
import type { StepUsageEvent } from "@vbar/shared";
import { createQueueChannel } from "@vbar/shared/infra";

const ROUTING_KEY = "analytics.step-usage";

export class AnalyticsPublisher {
  private queueReady = false;
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || new ConsoleLogger("AnalyticsPublisher");
  }

  private async getChannel() {
    const channel = await createQueueChannel({
      uri: ConfigHelper.getEnv("RABBITMQ_URI", "amqp://admin:admin@localhost:5672"),
    });

    if (!this.queueReady) {
      const queueName = ServiceConfig.messageQueue.queues.analyticsStepUsage;
      const exchangeName = ServiceConfig.messageQueue.exchanges.default;
      await channel.assertQueue(queueName, { durable: true });
      await channel.bindQueue(queueName, exchangeName, ROUTING_KEY);
      this.queueReady = true;
    }

    return channel;
  }

  /**
   * Publish step usage event — fire-and-forget, errors logged only.
   */
  publishStepUsage(event: Omit<StepUsageEvent, "type" | "timestamp">): void {
    (async () => {
      try {
        const ch = await this.getChannel();
        const payload: StepUsageEvent = {
          type: "step_usage",
          timestamp: new Date().toISOString(),
          ...event,
        };

        const published = ch.publish(
          ServiceConfig.messageQueue.exchanges.default,
          ROUTING_KEY,
          Buffer.from(JSON.stringify(payload)),
          { persistent: true }
        );

        if (!published) {
          this.logger.warn("Failed to publish step usage event (buffer full)", {
            stepId: event.stepId,
          });
        }
      } catch (error) {
        this.logger.error("Error publishing step usage event", {
          stepId: event.stepId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    })();
  }
}
