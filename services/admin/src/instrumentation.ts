/**
 * Next.js instrumentation hook
 *
 * Runs once per server start. Starts the RabbitMQ step-usage consumer
 * on the Node.js runtime only — amqplib/mongoose must never load in Edge
 * (middleware).
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startStepUsageConsumer } = await import("@/lib/step-usage-consumer");
    await startStepUsageConsumer();
  }
}
