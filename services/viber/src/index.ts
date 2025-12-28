/**
 * Viber Service Entry Point
 *
 * Express.js server with Hexagonal Architecture
 */

import express, { Express } from "express";
import dotenv from "dotenv";
import { ConfigHelper, ServiceConfig } from "@vbar/shared";
import { getDatabase, closeConnection } from "./config/database";
import { getConnection, closeMessageQueue } from "./config/messageQueue";
import { getViberConfig } from "./config/viber";
import routes from "./adapters/in/routes";
import {
  generalRateLimiter,
  webhookRateLimiter,
} from "./adapters/in/middleware";
import { ViberBotService } from "./application/services/ViberBotService";

// Load environment variables
dotenv.config();

const app: Express = express();
const port = ConfigHelper.getEnvNumber("PORT", ServiceConfig.ports.viber);

// Store ViberBotService instance globally for middleware access
let viberBotService: ViberBotService | null = null;

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
app.post("/webhook/viber", webhookRateLimiter, (req, res, next) => {
  if (!viberBotService || !viberBotService.isInitialized()) {
    return res.status(503).json({
      error: {
        code: "SVC_003",
        message: "Bot service not available",
      },
    });
  }
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
    await getDatabase();
    console.log("MongoDB connected");

    // Initialize RabbitMQ connection
    console.log("Connecting to RabbitMQ...");
    await getConnection();
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

      // Register event handlers
      // TODO: After Steps 3-9 are complete, create and register handlers here:
      // const messageHandler = new MessageHandler();
      // const subscribeHandler = new SubscribeHandler();
      // const unsubscribeHandler = new UnsubscribeHandler();
      // const conversationStartedHandler = new ConversationStartedHandler();
      // const deliveryHandler = new DeliveryHandler();
      // const messageSentHandler = new MessageSentHandler();
      // const handlers = [
      //   messageHandler,
      //   subscribeHandler,
      //   unsubscribeHandler,
      //   conversationStartedHandler,
      //   deliveryHandler,
      //   messageSentHandler,
      // ];
      // viberBotService.registerEventHandlers(handlers);
      // console.log("Event handlers registered successfully");
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
