/**
 * Route definitions for Viber Service
 */

import { Router } from "express";
import { healthCheckHandler } from "./health";
import { healthCheckRateLimiter } from "../middleware/rateLimiters";
import { configureWebhookRoutes } from "./webhook";

const router = Router();

// Health check route with strict rate limiting
router.get("/health", healthCheckRateLimiter, healthCheckHandler);

// Webhook routes (with signature verification and rate limiting)
configureWebhookRoutes(router);

export default router;
