/**
 * Webhook route handler for Viber Service
 *
 * Handles Viber webhook events including:
 * - GET /webhook/viber: Webhook verification (Viber requirement)
 * - POST /webhook/viber: Webhook event handler (handled by viber-bot middleware in index.ts)
 *
 * IMPORTANT: POST /webhook/viber is now handled by viber-bot middleware in index.ts.
 * The middleware automatically routes events to registered event handlers in the
 * application/handlers/ directory. This file only configures the GET verification endpoint.
 *
 * Security:
 * - Signature verification: May be handled by viber-bot middleware (verify if needed)
 * - Rate limiting applied (via middleware in index.ts)
 * - All webhook events logged for audit (via event handlers)
 *
 * Location: Input Adapters layer (Hexagonal Architecture)
 */

import { Request, Response } from "express";
import { webhookRateLimiter } from "../middleware/rateLimiters";

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
 * Export route configuration
 * This function sets up the webhook routes with appropriate middleware
 *
 * Note: POST /webhook/viber is now handled by viber-bot middleware in index.ts.
 * This function only configures the GET verification endpoint.
 *
 * The viber-bot middleware (bot.middleware()) is applied at the Express app level
 * in index.ts and automatically routes events to registered event handlers.
 */
export function configureWebhookRoutes(router: any): void {
  // GET /webhook/viber - Webhook verification (Viber requirement)
  // This endpoint is called by Viber during webhook setup to verify the endpoint
  router.get("/webhook/viber", webhookRateLimiter, webhookVerificationHandler);

  // POST /webhook/viber - Webhook event handler
  // NOTE: This route is now handled by viber-bot middleware in index.ts
  // The middleware is applied at the Express app level and automatically
  // routes events to registered event handlers.
  //
  // The old POST handler (webhookEventHandler) has been replaced by:
  // - viber-bot middleware (bot.middleware()) in index.ts
  // - Event handlers in application/handlers/ directory
  //
  // If you need to keep the old handler for reference, it's commented out below:
  // router.post(
  //   "/webhook/viber",
  //   webhookRateLimiter,
  //   verifyWebhookSignature,
  //   webhookEventHandler
  // );
}
