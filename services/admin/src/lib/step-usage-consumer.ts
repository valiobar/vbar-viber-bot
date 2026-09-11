/**
 * Step Usage Consumer
 *
 * RabbitMQ consumer that persists StepUsageEvent messages from the viber
 * service into admin_service.stepusageevents. Started once per server
 * process via src/instrumentation.ts.
 */
import mongoose from "mongoose";
import { ConfigHelper, ServiceConfig } from "@vbar/shared";
import type { StepUsageEvent } from "@vbar/shared";
import { createQueueChannel } from "@vbar/shared/infra";
import { connectToDatabase } from "@/lib/mongodb";
import { StepUsageEventModel } from "@/domains/analytics/StepUsageEventModel";

const QUEUE_NAME = ServiceConfig.messageQueue.queues.analyticsStepUsage;
const EXCHANGE_NAME = ServiceConfig.messageQueue.exchanges.default;
const ROUTING_KEY = "analytics.step-usage";

let isConsuming = false;

const isTransientError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return /timeout|ECONNRESET|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|network|buffering/i.test(
    message
  );
};

export async function startStepUsageConsumer(): Promise<void> {
  if (isConsuming) {
    console.log("Step usage consumer already started");
    return;
  }
  isConsuming = true;

  try {
    const channel = await createQueueChannel({
      uri: ConfigHelper.getEnv(
        "RABBITMQ_URI",
        "amqp://admin:admin@localhost:5672"
      ),
    });

    await channel.assertQueue(QUEUE_NAME, { durable: true });
    await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, ROUTING_KEY);

    await channel.consume(
      QUEUE_NAME,
      async (message) => {
        if (!message) return;
        try {
          const event: StepUsageEvent = JSON.parse(message.content.toString());

          // Poison messages: ack + drop (retry would never succeed)
          if (
            !event.stepId ||
            !event.userId ||
            !mongoose.Types.ObjectId.isValid(event.stepId)
          ) {
            console.warn("Dropping invalid step usage event", event);
            channel.ack(message);
            return;
          }

          await connectToDatabase();
          await StepUsageEventModel.create({
            stepId: new mongoose.Types.ObjectId(event.stepId),
            userId: event.userId,
            source: event.source,
            trigger: event.trigger ?? null,
            customHandler: event.customHandler ?? null,
            timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
          });

          channel.ack(message);
        } catch (error) {
          console.error("Error processing step usage event:", error);
          try {
            channel.nack(message, false, isTransientError(error));
          } catch (nackError) {
            console.error("Failed to nack step usage event:", nackError);
          }
        }
      },
      { noAck: false }
    );

    console.log(`Step usage consumer started, listening on queue: ${QUEUE_NAME}`);
  } catch (error) {
    isConsuming = false;
    console.error("Failed to start step usage consumer:", error);
    // Do not rethrow — admin must keep serving even if RabbitMQ is down;
    // durable queue buffers events until the next server restart.
  }
}
