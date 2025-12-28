/**
 * AI Service Entry Point
 * 
 * Express.js server with Hexagonal Architecture
 */

import express, { Express } from "express";
import dotenv from "dotenv";
import { ConfigHelper, ServiceConfig } from "@vbar/shared";
import { getDatabase, closeConnection } from "./config/database";
import { getConnection, closeMessageQueue } from "./config/messageQueue";
import routes from "./adapters/in/routes";

// Load environment variables
dotenv.config();

const app: Express = express();
const port = ConfigHelper.getEnvNumber("PORT", ServiceConfig.ports.ai);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use("/", routes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    service: "ai",
    version: "1.0.0",
    status: "running",
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Error:", err);
  res.status(500).json({
    error: {
      code: "SVC_002",
      message: "Internal server error",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: "SVC_001",
      message: "Not found",
    },
  });
});

/**
 * Initialize service connections
 */
async function initialize(): Promise<void> {
  try {
    // Initialize MongoDB connection
    console.log("Connecting to MongoDB...");
    await getDatabase();
    console.log("MongoDB connected");

    // Initialize RabbitMQ connection
    console.log("Connecting to RabbitMQ...");
    await getConnection();
    console.log("RabbitMQ connected");

    // Start server
    app.listen(port, () => {
      console.log(`AI Service running on port ${port}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("Failed to initialize service:", error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
async function shutdown(): Promise<void> {
  console.log("Shutting down AI Service...");
  
  try {
    await closeMessageQueue();
    console.log("RabbitMQ connection closed");
  } catch (error) {
    console.error("Error closing RabbitMQ:", error);
  }

  try {
    await closeConnection();
    console.log("MongoDB connection closed");
  } catch (error) {
    console.error("Error closing MongoDB:", error);
  }

  process.exit(0);
}

// Handle graceful shutdown
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// Handle unhandled errors
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  shutdown();
});

// Initialize service
initialize();



