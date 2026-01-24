/**
 * Web3 Service Entry Point
 *
 * Express.js server with Hexagonal Architecture
 */

// Load environment variables FIRST, before any other imports
import dotenv from "dotenv";
dotenv.config();
console.log("Loading environment variables...");

// Now import everything else
import express, { Express } from "express";
import * as grpc from "@grpc/grpc-js";
import { ConfigHelper, ConsoleLogger } from "@vbar/shared";
import { connectToDatabase, closeConnection } from "./config/database";
import { getConnection, closeMessageQueue } from "./config/messageQueue";
import routes from "./adapters/in/routes";
import { createGrpcServer } from "./adapters/in/grpc/server";

// Load environment variables

const app: Express = express();
const port = ConfigHelper.getEnvNumber("PORT", 3004);

// gRPC server instance (stored for graceful shutdown)
let grpcServer: grpc.Server | null = null;

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
    service: "web3",
    version: "1.0.0",
    status: "running",
  });
});

// Error handling middleware
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Error:", err);
    res.status(500).json({
      error: {
        code: "SVC_002",
        message: "Internal server error",
        details:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      },
    });
  }
);

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
    await connectToDatabase();
    console.log("MongoDB connected");

    // Initialize RabbitMQ connection
    console.log("Connecting to RabbitMQ...");
    await getConnection();
    console.log("RabbitMQ connected");

    // Initialize gRPC server
    const logger = new ConsoleLogger("Web3Service");
    console.log("Creating gRPC server...");
    grpcServer = createGrpcServer(logger);
    const grpcPort = ConfigHelper.getEnvNumber("GRPC_PORT", 50052);

    grpcServer.bindAsync(
      `0.0.0.0:${grpcPort}`,
      grpc.ServerCredentials.createInsecure(),
      (error, port) => {
        if (error) {
          console.error("Failed to start gRPC server:", error);
          process.exit(1);
        }
        console.log(`gRPC server running on port ${grpcPort}`);
      }
    );

    // Start server
    app.listen(port, () => {
      console.log(`Web3 Service running on port ${port}`);
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
  console.log("Shutting down Web3 Service...");

  // Shutdown gRPC server
  if (grpcServer) {
    try {
      await new Promise<void>((resolve, reject) => {
        grpcServer!.tryShutdown((error) => {
          if (error) {
            console.error("Error shutting down gRPC server:", error);
            grpcServer!.forceShutdown();
          }
          console.log("gRPC server closed");
          resolve();
        });
      });
    } catch (error) {
      console.error("Error closing gRPC server:", error);
      if (grpcServer) {
        grpcServer.forceShutdown();
      }
    }
  }

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
