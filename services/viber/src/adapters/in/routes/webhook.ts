/**
 * Webhook route handler for Viber Service
 *
 * Handles Viber webhook events including:
 * - GET /webhook/viber: Webhook verification (Viber requirement)
 * - POST /webhook/viber: Webhook event handler
 *
 * Security:
 * - Signature verification required for POST requests
 * - Rate limiting applied
 * - All webhook events logged for audit
 *
 * Location: Input Adapters layer (Hexagonal Architecture)
 */

import { Request, Response } from "express";
import { verifyWebhookSignature } from "../middleware/webhookSignature";
import { webhookRateLimiter } from "../middleware/rateLimiters";

/**
 * Viber webhook event types
 */
type ViberWebhookEvent =
  | "message"
  | "delivered"
  | "seen"
  | "conversation_started"
  | "subscribed"
  | "unsubscribed";

/**
 * Viber webhook event payload structure
 */
interface ViberWebhookPayload {
  event: ViberWebhookEvent;
  timestamp: number;
  message_token: number;
  user: {
    id: string;
    name: string;
    avatar?: string;
    language?: string;
    country?: string;
  };
  message?: {
    type:
      | "text"
      | "picture"
      | "video"
      | "file"
      | "location"
      | "contact"
      | "sticker"
      | "url";
    text?: string;
    media?: string;
    location?: {
      lat: number;
      lon: number;
    };
  };
}

/**
 * GET /webhook/viber
 * Webhook verification endpoint (Viber requirement)
 *
 * Viber calls this endpoint during webhook setup to verify the endpoint is valid.
 * This is a simple verification that returns 200 OK.
 *
 * Query Parameters (from Viber):
 * - event: Event type
 * - timestamp: Timestamp
 * - message_token: Message token
 * - user_id: User ID
 */
export function webhookVerificationHandler(req: Request, res: Response): void {
  try {
    // Log verification request for audit
    console.log("Webhook verification request:", {
      method: req.method,
      query: req.query,
      timestamp: new Date().toISOString(),
    });

    // Viber expects a simple 200 OK response for verification
    res.status(200).json({
      status: "ok",
    });
  } catch (error) {
    console.error("Webhook verification error:", error);
    res.status(500).json({
      error: {
        code: "SVC_002",
        message: "Internal server error",
      },
    });
  }
}

/**
 * POST /webhook/viber
 * Webhook event handler
 *
 * Processes incoming Viber webhook events. This handler:
 * - Verifies webhook signature (via middleware)
 * - Parses JSON from raw body (after signature verification)
 * - Logs all events for audit
 * - Processes different event types
 * - Returns appropriate responses
 *
 * Security:
 * - Signature verification is required (handled by middleware)
 * - Rate limiting is applied (handled by middleware)
 */
export async function webhookEventHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // Parse webhook payload from raw body (after signature verification)
    let payload: ViberWebhookPayload;
    try {
      // Get raw body (Buffer) and parse JSON
      // The raw body is stored in req.rawBody by the middleware
      const rawBody = (req as any).rawBody || req.body;
      if (Buffer.isBuffer(rawBody)) {
        payload = JSON.parse(rawBody.toString("utf8")) as ViberWebhookPayload;
      } else if (typeof rawBody === "object") {
        // Already parsed (shouldn't happen with express.raw, but handle it)
        payload = rawBody as ViberWebhookPayload;
      } else {
        throw new Error("Invalid request body format");
      }
    } catch (error) {
      console.error("Failed to parse webhook payload:", error);
      res.status(400).json({
        error: {
          code: "GEN_001",
          message: "Invalid webhook payload",
        },
      });
      return;
    }

    // Log webhook event for audit
    console.log("Webhook event received:", {
      event: payload.event,
      userId: payload.user?.id,
      timestamp: new Date(payload.timestamp).toISOString(),
      messageToken: payload.message_token,
      receivedAt: new Date().toISOString(),
    });

    // Process different event types
    switch (payload.event) {
      case "message":
        await handleMessageEvent(payload);
        break;
      case "delivered":
        await handleDeliveredEvent(payload);
        break;
      case "seen":
        await handleSeenEvent(payload);
        break;
      case "conversation_started":
        await handleConversationStartedEvent(payload);
        break;
      case "subscribed":
        await handleSubscribedEvent(payload);
        break;
      case "unsubscribed":
        await handleUnsubscribedEvent(payload);
        break;
      default:
        console.warn("Unknown webhook event type:", payload.event);
    }

    // Return success response to Viber
    res.status(200).json({
      status: "ok",
    });
  } catch (error) {
    console.error("Webhook event processing error:", error);
    // Still return 200 to Viber to prevent retries for processing errors
    // Log the error for investigation
    res.status(200).json({
      status: "ok",
    });
  }
}

/**
 * Handle message event
 * This is a placeholder - actual message processing will be implemented
 * in the application/domain layers in future steps.
 */
async function handleMessageEvent(payload: ViberWebhookPayload): Promise<void> {
  console.log("Processing message event:", {
    userId: payload.user.id,
    messageType: payload.message?.type,
    messageText: payload.message?.text,
  });

  // TODO: Implement message processing logic
  // This will be handled by application/domain layers in future steps
  // - Save message to database
  // - Process message with AI service (if enabled)
  // - Send response to user
  // - Publish analytics events
}

/**
 * Handle delivered event
 */
async function handleDeliveredEvent(
  payload: ViberWebhookPayload
): Promise<void> {
  console.log("Message delivered:", {
    userId: payload.user.id,
    messageToken: payload.message_token,
  });

  // TODO: Update message status in database
}

/**
 * Handle seen event
 */
async function handleSeenEvent(payload: ViberWebhookPayload): Promise<void> {
  console.log("Message seen:", {
    userId: payload.user.id,
    messageToken: payload.message_token,
  });

  // TODO: Update message status in database
}

/**
 * Handle conversation started event
 */
async function handleConversationStartedEvent(
  payload: ViberWebhookPayload
): Promise<void> {
  console.log("Conversation started:", {
    userId: payload.user.id,
  });

  // TODO: Initialize conversation in database
  // TODO: Send welcome message
}

/**
 * Handle subscribed event
 */
async function handleSubscribedEvent(
  payload: ViberWebhookPayload
): Promise<void> {
  console.log("User subscribed:", {
    userId: payload.user.id,
    name: payload.user.name,
  });

  // TODO: Update user subscription status in database
  // TODO: Send welcome message
}

/**
 * Handle unsubscribed event
 */
async function handleUnsubscribedEvent(
  payload: ViberWebhookPayload
): Promise<void> {
  console.log("User unsubscribed:", {
    userId: payload.user.id,
  });

  // TODO: Update user subscription status in database
}

/**
 * Export route configuration
 * This function sets up the webhook routes with appropriate middleware
 */
export function configureWebhookRoutes(router: any): void {
  // GET /webhook/viber - Webhook verification (no signature verification needed)
  router.get("/webhook/viber", webhookRateLimiter, webhookVerificationHandler);

  // POST /webhook/viber - Webhook event handler
  // Note: Signature verification and rate limiting are applied
  // The raw body middleware must be configured in the main server file
  // before the JSON parser for signature verification to work
  router.post(
    "/webhook/viber",
    webhookRateLimiter,
    verifyWebhookSignature,
    webhookEventHandler
  );
}
