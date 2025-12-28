/**
 * Health Check Routes
 *
 * Health check endpoint for AI Service
 */

import { Router, Request, Response } from "express";
import { HealthCheckResponse } from "@vbar/shared";
import { connectToDatabase } from "../../../config/database";
import { getConnection } from "../../../config/messageQueue";
import mongoose from "mongoose";

const router = Router();

/**
 * GET /api/health
 * Service health check endpoint
 */
router.get("/", async (req: Request, res: Response) => {
  const startTime = Date.now();
  const health: HealthCheckResponse = {
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "ai",
    version: "1.0.0",
    uptime: process.uptime(),
    dependencies: {},
  };

  // Check MongoDB connection
  try {
    await connectToDatabase();
    const db = mongoose.connection.db;
    if (db) {
      await db.admin().ping();
      health.dependencies!.database = "connected";
    } else {
      health.status = "error";
      health.dependencies!.database = "disconnected";
    }
  } catch (error) {
    health.status = "error";
    health.dependencies!.database = "disconnected";
  }

  // Check RabbitMQ connection
  try {
    await getConnection();
    health.dependencies!.messageQueue = "connected";
  } catch (error) {
    health.status = "error";
    health.dependencies!.messageQueue = "disconnected";
  }

  // Check AI provider connection (placeholder for future implementation)
  // This will be implemented when AI provider adapters are created
  health.dependencies = {
    ...health.dependencies,
    aiProvider: "connected", // Placeholder
  };

  const statusCode = health.status === "ok" ? 200 : 503;
  res.status(statusCode).json(health);
});

export default router;
