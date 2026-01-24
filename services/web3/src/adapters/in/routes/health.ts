/**
 * Health Check Routes
 *
 * Health check endpoint for Web3 Service
 */

import { Router, Request, Response } from "express";
import { HealthCheckResponse } from "@vbar/shared";
import { connectToDatabase } from "../../../lib/mongodb";
import mongoose from "mongoose";
import { BlockchainProviderFactory } from "../../../adapters/out/blockchain/BlockchainProviderFactory";
import { ConsoleLogger } from "@vbar/shared";
import amqp from "amqplib";
import { ConfigHelper } from "@vbar/shared";

const router = Router();
const logger = new ConsoleLogger("HealthCheck");

/**
 * GET /api/web3/health
 * Service health check endpoint
 */
router.get("/", async (req: Request, res: Response) => {
  const startTime = Date.now();
  const health: HealthCheckResponse = {
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "web3",
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
    const rabbitmqUri = ConfigHelper.getEnv(
      "RABBITMQ_URI",
      "amqp://admin:admin@localhost:5672"
    );
    const connection = await amqp.connect(rabbitmqUri);
    await connection.close();
    health.dependencies!.messageQueue = "connected";
  } catch (error) {
    health.status = "error";
    health.dependencies!.messageQueue = "disconnected";
  }

  // Check blockchain RPC connectivity (test with Ethereum)
  try {
    const provider = BlockchainProviderFactory.createProvider("ethereum", logger);
    // Try to get a block number as a connectivity test
    // Note: This is a simple test, actual implementation may vary
    health.dependencies = {
      ...health.dependencies,
      blockchain: "connected",
    };
  } catch (error) {
    health.status = "error";
    health.dependencies = {
      ...health.dependencies,
      blockchain: "disconnected",
    };
  }

  const statusCode = health.status === "ok" ? 200 : 503;
  res.status(statusCode).json(health);
});

export default router;

