/**
 * Health check route handler
 *
 * Security considerations:
 * - Rate limited to prevent abuse
 * - Limited information in production to prevent information disclosure
 * - Basic health status maintained for monitoring tools
 */

import { Request, Response } from "express";
import { ConfigHelper, HealthCheckResponse } from "@vbar/shared";
import { createMongoConnection, createQueueChannel } from "@vbar/shared/infra";
import mongoose from "mongoose";

/**
 * Health check endpoint handler
 * GET /health
 *
 * Returns minimal information in production:
 * - status: "ok" | "error"
 * - timestamp: ISO timestamp
 * - service: service name
 *
 * In development, also includes:
 * - uptime: response time in seconds
 * - dependencies: database and message queue status
 */
export async function healthCheckHandler(
  req: Request,
  res: Response<HealthCheckResponse>
): Promise<void> {
  try {
    const startTime = Date.now();
    const isProduction = process.env.NODE_ENV === "production";

    // Check MongoDB connection
    let dbStatus: "connected" | "disconnected" = "disconnected";
    try {
      await createMongoConnection({
        uri: ConfigHelper.getEnv(
          "MONGODB_URI",
          "mongodb://bot:bot123@localhost:27018/bot?authSource=admin"
        ),
        dbName: ConfigHelper.getEnv("MONGODB_DB_NAME", "bot"),
      });
      const db = mongoose.connection.db;
      if (db) {
        await db.admin().ping();
        dbStatus = "connected";
      }
    } catch (error) {
      console.error("MongoDB health check failed:", error);
    }

    // Check RabbitMQ connection
    let mqStatus: "connected" | "disconnected" = "disconnected";
    try {
      await createQueueChannel({
        uri: ConfigHelper.getEnv(
          "RABBITMQ_URI",
          "amqp://admin:admin@localhost:5672"
        ),
      });
      mqStatus = "connected";
    } catch (error) {
      console.error("RabbitMQ health check failed:", error);
    }

    const overallStatus =
      dbStatus === "connected" && mqStatus === "connected" ? "ok" : "error";

    // Build response based on environment
    const response: HealthCheckResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      service: "viber",
    };

    // Only include detailed information in non-production environments
    if (!isProduction) {
      const uptime = Math.floor((Date.now() - startTime) / 1000);
      response.uptime = uptime;
      response.dependencies = {
        database: dbStatus,
        messageQueue: mqStatus,
      };
    }

    const statusCode = overallStatus === "ok" ? 200 : 503;
    res.status(statusCode).json(response);
  } catch (error) {
    console.error("Health check error:", error);

    // Minimal error response
    const isProduction = process.env.NODE_ENV === "production";
    const errorResponse: HealthCheckResponse = {
      status: "error",
      timestamp: new Date().toISOString(),
      service: "viber",
    };

    // Only include dependencies in non-production
    if (!isProduction) {
      errorResponse.dependencies = {
        database: "disconnected",
        messageQueue: "disconnected",
      };
    }

    res.status(503).json(errorResponse);
  }
}
