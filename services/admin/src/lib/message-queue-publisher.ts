/**
 * Message Queue Publisher
 *
 * RabbitMQ publisher for sending refresh events to viber service instances.
 * Uses fire-and-forget pattern to avoid blocking admin service operations.
 *
 * Location: Infrastructure/Output Adapter
 */

import { ConfigHelper, ServiceConfig } from "@vbar/shared";
import { createQueueChannel } from "@vbar/shared/infra";
import type { RefreshEvent } from "@vbar/shared";

let queueReady = false;

const getPublisherChannel = async () => {
  const channel = await createQueueChannel({
    uri: ConfigHelper.getEnv(
      "RABBITMQ_URI",
      "amqp://admin:admin@localhost:5672"
    ),
  });

  if (!queueReady) {
    const queueName = ServiceConfig.messageQueue.queues.viberRefresh;
    const exchangeName = ServiceConfig.messageQueue.exchanges.default;
    await channel.assertQueue(queueName, { durable: true });
    await channel.bindQueue(queueName, exchangeName, "viber.refresh");
    queueReady = true;
  }

  return channel;
};

/**
 * Publish refresh event to RabbitMQ
 *
 * Fire-and-forget pattern - doesn't await, just logs errors
 */
export async function publishRefreshEvent(
  dataType?: "all" | "steps" | "messages" | "keyboards" | "bot_settings"
): Promise<void> {
  (async () => {
    try {
      const ch = await getPublisherChannel();
      const event: RefreshEvent = {
        type: "bot_data_refresh",
        timestamp: new Date().toISOString(),
        source: "admin_service",
        dataType: dataType || "all",
      };

      const published = ch.publish(
        ServiceConfig.messageQueue.exchanges.default,
        "viber.refresh",
        Buffer.from(JSON.stringify(event)),
        { persistent: true }
      );

      if (!published) {
        console.warn("Failed to publish refresh event (buffer full)");
      } else {
        console.log(`Published refresh event: ${event.dataType}`);
      }
    } catch (error) {
      console.error("Error publishing refresh event:", error);
    }
  })();
}

export { closeQueue as closeMessageQueue } from "@vbar/shared/infra";
