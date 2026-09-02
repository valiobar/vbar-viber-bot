/**
 * Viber Service Entry Point
 *
 * Express.js server with Hexagonal Architecture
 */

import express, { Express } from "express";
import dotenv from "dotenv";
import { ConfigHelper, ServiceConfig, ConsoleLogger, resolveRootEnvPath } from "@vbar/shared";
import { createMongoConnection, closeMongoConnection, createQueueChannel, closeQueue } from "@vbar/shared/infra";
import { getViberConfig } from "./config/viber";
import routes from "./adapters/in/routes";
import { generalRateLimiter } from "./adapters/in/middleware";
import { ViberBotService } from "./application/services/ViberBotService";
import { MessageHandler } from "./application/handlers/MessageHandler";
import { SubscribeHandler } from "./application/handlers/SubscribeHandler";
import { UnsubscribeHandler } from "./application/handlers/UnsubscribeHandler";
import { ConversationStartedHandler } from "./application/handlers/ConversationStartedHandler";
import { DeliveryHandler } from "./application/handlers/DeliveryHandler";
import { IUserRepository } from "./ports/out/IUserRepository";
import { MongooseUserRepository } from "./adapters/out/MongooseUserRepository";
import { RefreshConsumer } from "./adapters/in/consumers/RefreshConsumer";
import { IAiServiceClient } from "./ports/out/IAiServiceClient";
import { AiServiceGrpcClient } from "./adapters/out/grpc/AiServiceGrpcClient";

// Load monorepo-root .env (single system env file)
const rootEnv = resolveRootEnvPath();
if (rootEnv) {
  dotenv.config({ path: rootEnv });
} else {
  dotenv.config();
}
const app: Express = express();
const port = ConfigHelper.getEnvNumber("PORT", ServiceConfig.ports.viber);

// Store ViberBotService instance globally for middleware access
let viberBotService: ViberBotService | null = null;
let refreshConsumer: RefreshConsumer | null = null;

// Middleware to preserve raw body for webhook signature verification
// This must be applied before JSON parsing for webhook routes
app.use(
  "/webhook/viber",
  express.raw({ type: "application/json" }),
  (req, res, next) => {
    // Store raw body for signature verification
    // The raw body is already available as req.body (Buffer) from express.raw()
    // Store it in req.rawBody for the signature verification middleware
    (req as any).rawBody = req.body;
    next();
  }
);

// JSON parsing middleware (applied after raw body preservation for webhook routes)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Security middleware order:
// 1. JSON/URL parsing (above)
// 2. Request logging (above)
// 3. General rate limiting (base layer for all routes)
// 4. Route-specific middleware (applied in route handlers: webhook signature verification, service auth, specific rate limits)
// 5. Route handlers (below)
// Apply general rate limiting to all routes (base layer)
app.use(generalRateLimiter);

// POST /webhook/viber - ViberBot middleware integration
// This route uses viber-bot middleware to handle webhook events automatically
// The middleware routes events to registered event handlers
// Note: This is applied before general routes to ensure proper event handling
// Rate limiting is applied via webhookRateLimiter middleware
app.use("/webhook/viber", (req, res, next) => {
  if (!viberBotService || !viberBotService.isInitialized()) {
    return res.status(503).json({
      error: {
        code: "SVC_003",
        message: "Bot service not available",
      },
    });
  }
  console.log("Webhook received");
  const bot = viberBotService.getBot();
  return bot.middleware()(req, res, next);
});

// Routes
app.use("/", routes);

// Root endpoint - minimal information (security through obscurity)
// Version details removed to prevent information disclosure
app.get("/", (req, res) => {
  res.json({
    service: "viber",
    status: "running",
  });
});

// Error handling middleware
// Note: Security-related errors (authentication failures, rate limit exceeded, etc.)
// are handled directly by security middleware and return appropriate error responses
// with codes: AUTH_001, AUTH_002 (authentication), SVC_003 (rate limiting)
// This handler catches unhandled errors and unexpected exceptions
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
    await createMongoConnection({
      uri: ConfigHelper.getEnv(
        "MONGODB_URI",
        "mongodb://bot:bot123@localhost:27018/bot?authSource=admin"
      ),
      dbName: ConfigHelper.getEnv("MONGODB_DB_NAME", "bot"),
    });
    console.log("MongoDB connected");

    // Initialize user repository
    const userRepository: IUserRepository = new MongooseUserRepository();
    console.log("User repository initialized");

    // Initialize AI Service gRPC client
    const aiClientLogger = new ConsoleLogger("AiServiceClient");
    const aiServiceClient: IAiServiceClient = new AiServiceGrpcClient(
      aiClientLogger
    );
    console.log("AI Service gRPC client initialized");

    // Initialize RabbitMQ connection
    console.log("Connecting to RabbitMQ...");
    await createQueueChannel({
      uri: ConfigHelper.getEnv(
        "RABBITMQ_URI",
        "amqp://admin:admin@localhost:5672"
      ),
    });
    console.log("RabbitMQ connected");

    // Initialize Viber Bot
    console.log("Initializing Viber Bot...");
    try {
      viberBotService = new ViberBotService();
      await viberBotService.initializeBot();
      console.log("Viber Bot initialized successfully");

      // Register webhook with Viber API
      try {
        await viberBotService.registerWebhook();
        console.log("Webhook registered with Viber API");
      } catch (error) {
        console.error("Failed to register webhook:", error);
        // Continue startup - webhook can be registered later
        // In production, you may want to exit if webhook registration is critical
      }

      // Create and register event handlers
      try {
        const messageHandler = new MessageHandler(
          userRepository,
          viberBotService,
          undefined,
          aiServiceClient
        );
        const subscribeHandler = new SubscribeHandler(
          userRepository,
          viberBotService
        );
        const unsubscribeHandler = new UnsubscribeHandler(userRepository);
        const conversationStartedHandler = new ConversationStartedHandler(
          userRepository
        );
        const deliveryHandler = new DeliveryHandler();
        // MessageSentHandler is optional and not yet implemented
        // const messageSentHandler = new MessageSentHandler();

        const handlers = [
          messageHandler,
          subscribeHandler,
          unsubscribeHandler,
          conversationStartedHandler,
          deliveryHandler,
          // messageSentHandler, // Optional - can be added when implemented
        ];

        viberBotService.registerEventHandlers(handlers);
        console.log(
          `Event handlers registered successfully (${handlers.length} handlers)`
        );
      } catch (error) {
        console.error("Failed to register event handlers:", error);
        // Continue startup - handlers can be registered later
        // In production, you may want to exit if handler registration is critical
      }
    } catch (error) {
      console.error("Failed to initialize Viber Bot:", error);
      // Continue without bot - bot may be optional for service startup
      // In production, you may want to exit if bot initialization is critical
    }

    // Validate Viber configuration
    const viberConfig = getViberConfig();
    if (!viberConfig.token || !viberConfig.webhookUrl) {
      console.warn("Warning: Viber bot token or webhook URL not configured");
    } else {
      console.log("Viber bot configuration loaded");
    }

    // Initialize refresh consumer
    if (viberBotService) {
      try {
        refreshConsumer = new RefreshConsumer(viberBotService);
        await refreshConsumer.start();
        console.log("Refresh consumer initialized and started");
      } catch (error) {
        console.error("Failed to initialize refresh consumer:", error);
        // Don't fail service startup if consumer fails
        // Consumer will retry on next connection
      }
    }

    // Start server
    app.listen(port, () => {
      console.log(`Viber Service running on port ${port}`);
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
  console.log("Shutting down Viber Service...");

  // Stop refresh consumer
  if (refreshConsumer) {
    try {
      await refreshConsumer.stop();
    } catch (error) {
      console.error("Error stopping refresh consumer:", error);
    }
  }

  try {
    await closeQueue();
    console.log("RabbitMQ connection closed");
  } catch (error) {
    console.error("Error closing RabbitMQ:", error);
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
