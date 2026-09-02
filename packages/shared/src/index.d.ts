/**
 * Shared package exports
 *
 * This package contains common types, utilities, and configurations
 * used across all microservices in the Viber bot architecture.
 *
 * Mongo/RabbitMQ connection helpers live at `@vbar/shared/infra` (not this
 * barrel) so Next.js Edge middleware can import ConfigHelper without loading
 * mongoose or amqplib.
 */
export * from "./types";
export * from "./utils";
export * from "./config";
//# sourceMappingURL=index.d.ts.map