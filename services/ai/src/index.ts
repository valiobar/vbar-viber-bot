/**
 * AI Service Entry Point
 *
 * Express.js server with Hexagonal Architecture
 */

import express, { Express } from "express";
import dotenv from "dotenv";
import * as grpc from "@grpc/grpc-js";
import { ConfigHelper, ServiceConfig, ConsoleLogger, resolveRootEnvPath } from "@vbar/shared";
import { createMongoConnection, closeMongoConnection } from "@vbar/shared/infra";
import { initializeLangSmith } from "./config/langsmith";
import { createRoutes } from "./adapters/in/routes";
import { createGrpcServer } from "./adapters/in/grpc/server";
import { createVectorStore } from "./adapters/out/langchain/rag/VectorStoreFactory";
import { initBulgarianCulturePrompt } from "./scripts/initBulgarianCulturePrompt";

// Load monorepo-root .env (single system env file)
const rootEnv = resolveRootEnvPath();
if (rootEnv) {
  dotenv.config({ path: rootEnv });
} else {
  dotenv.config();
}
const app: Express = express();
const port = ConfigHelper.getEnvNumber("PORT", ServiceConfig.ports.ai);

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

// Shared vector store + HTTP routes (module scope — must stay BEFORE the error/404 handlers)
const logger = new ConsoleLogger("AIService");
const vectorStore = createVectorStore(logger); // sync; null when RAG_ENABLED=false

app.use("/", createRoutes(vectorStore, logger));

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    service: "ai",
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
    // Initialize LangSmith tracing (optional)
    initializeLangSmith();
    console.log(
      "LangSmith tracing:",
      process.env.LANGSMITH_TRACING === "true" ? "enabled" : "disabled"
    );

    // Initialize MongoDB connection
    console.log("Connecting to MongoDB...");
    await createMongoConnection({
      uri: ConfigHelper.getEnv(
        "MONGODB_URI",
        "mongodb://ai:ai123@localhost:27019/ai?authSource=admin"
      ),
      dbName: ConfigHelper.getEnv("MONGODB_DB_NAME", "ai"),
    });
    console.log("MongoDB connected");

    // Initialize Bulgarian culture prompt template
    try {
      await initBulgarianCulturePrompt();
    } catch (error) {
      console.warn(
        "Failed to initialize Bulgarian culture prompt template, continuing anyway:",
        error instanceof Error ? error.message : String(error)
      );
    }

    // Initialize gRPC server (reuse module-scope logger + shared vector store)
    grpcServer = createGrpcServer(logger, vectorStore);
    const grpcPort = ConfigHelper.getEnvNumber("GRPC_PORT", 50051);

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
    await closeMongoConnection();
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
