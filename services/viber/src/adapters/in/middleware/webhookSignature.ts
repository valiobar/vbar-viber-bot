/**
 * Webhook signature verification middleware
 *
 * This middleware verifies Viber webhook signatures to ensure requests
 * are authentic and come from Viber's servers.
 *
 * Location: Input Adapters layer (Hexagonal Architecture)
 */

import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { getViberConfig } from "../../../config/viber";

/**
 * Middleware to verify Viber webhook signature
 *
 * Viber sends webhook requests with a signature in the X-Viber-Content-Signature header.
 * The signature is calculated using HMAC-SHA256 with the bot token as the secret.
 *
 * This middleware:
 * - Extracts the signature from the X-Viber-Content-Signature header
 * - Calculates the expected signature using the raw request body
 * - Compares signatures using timing-safe comparison to prevent timing attacks
 * - Returns 401 Unauthorized if signature is invalid or missing
 *
 * Note: This middleware requires the raw request body (Buffer) to be available.
 * Express must be configured to preserve raw body for webhook routes.
 * The raw body should be available as req.body (Buffer) or req.rawBody (Buffer).
 *
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export function verifyWebhookSignature(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // Get signature from header (case-insensitive)
    const signature = req.headers["x-viber-content-signature"] as string;

    if (!signature) {
      res.status(401).json({
        error: {
          code: "AUTH_001",
          message: "Missing webhook signature",
        },
      });
      return;
    }

    // Get raw body for signature calculation
    // Try multiple sources: rawBody (if preserved), body (if Buffer), or empty Buffer
    let rawBody: Buffer;
    if ((req as any).rawBody && Buffer.isBuffer((req as any).rawBody)) {
      rawBody = (req as any).rawBody;
    } else if (Buffer.isBuffer(req.body)) {
      rawBody = req.body;
    } else {
      // If body is already parsed, we need the raw body
      // This is a limitation - Express must be configured to preserve raw body
      // For now, log a warning and reject the request
      console.warn(
        "Webhook signature verification: Raw body not available. Express must be configured to preserve raw body for webhook routes."
      );
      res.status(500).json({
        error: {
          code: "SVC_002",
          message:
            "Server configuration error: Raw body not available for signature verification",
        },
      });
      return;
    }

    // Get Viber bot token from configuration
    const viberConfig = getViberConfig();
    if (!viberConfig.token) {
      console.error("Viber bot token not configured");
      res.status(500).json({
        error: {
          code: "SVC_002",
          message: "Server configuration error",
        },
      });
      return;
    }

    // Calculate expected signature using HMAC-SHA256
    const expectedSignature = crypto
      .createHmac("sha256", viberConfig.token)
      .update(rawBody)
      .digest("hex");

    // Compare signatures using timing-safe comparison to prevent timing attacks
    const signatureBuffer = Buffer.from(signature, "hex");
    const expectedSignatureBuffer = Buffer.from(expectedSignature, "hex");

    // Ensure buffers are the same length (timingSafeEqual requires equal length)
    if (signatureBuffer.length !== expectedSignatureBuffer.length) {
      res.status(401).json({
        error: {
          code: "AUTH_002",
          message: "Invalid webhook signature",
        },
      });
      return;
    }

    const isValid = crypto.timingSafeEqual(
      signatureBuffer,
      expectedSignatureBuffer
    );

    if (!isValid) {
      res.status(401).json({
        error: {
          code: "AUTH_002",
          message: "Invalid webhook signature",
        },
      });
      return;
    }

    // Signature is valid, proceed to next middleware
    next();
  } catch (error) {
    console.error("Error verifying webhook signature:", error);
    res.status(500).json({
      error: {
        code: "SVC_002",
        message: "Internal server error",
      },
    });
  }
}

