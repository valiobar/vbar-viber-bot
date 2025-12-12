/**
 * Health check route handler
 */

import { Request, Response } from "express";
import { HealthCheckResponse } from "@vbar/shared";
import { getDatabase } from "../../../config/database";
import { getConnection } from "../../../config/messageQueue";

/**
 * Health check endpoint handler
 * GET /health
 */
export async function healthCheckHandler(
  req: Request,
  res: Response<HealthCheckResponse>
): Promise<void> {
  try {
    const startTime = Date.now();

    // Check MongoDB connection
    let dbStatus: "connected" | "disconnected" = "disconnected";
    try {
      const db = await getDatabase();
      await db.admin().ping();
      dbStatus = "connected";
    } catch (error) {
      console.error("MongoDB health check failed:", error);
    }

    // Check RabbitMQ connection
    let mqStatus: "connected" | "disconnected" = "disconnected";
    try {
      await getConnection();
      mqStatus = "connected";
    } catch (error) {
      console.error("RabbitMQ health check failed:", error);
    }

    const uptime = Math.floor((Date.now() - startTime) / 1000);

    const response: HealthCheckResponse = {
      status:
        dbStatus === "connected" && mqStatus === "connected" ? "ok" : "error",
      timestamp: new Date().toISOString(),
      service: "viber",
      uptime,
      dependencies: {
        database: dbStatus,
        messageQueue: mqStatus,
      },
    };

    const statusCode = response.status === "ok" ? 200 : 503;
    res.status(statusCode).json(response);
  } catch (error) {
    console.error("Health check error:", error);
    res.status(503).json({
      status: "error",
      timestamp: new Date().toISOString(),
      service: "viber",
      dependencies: {
        database: "disconnected",
        messageQueue: "disconnected",
      },
    });
  }
}
