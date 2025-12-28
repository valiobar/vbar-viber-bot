/**
 * Security middleware exports
 *
 * Central export point for all security middleware functions.
 * This allows importing from a single location while keeping
 * middleware implementations in separate files.
 *
 * Location: Input Adapters layer (Hexagonal Architecture)
 */

// Webhook signature verification
export { verifyWebhookSignature } from "./webhookSignature";

// Rate limiters
export {
  generalRateLimiter,
  healthCheckRateLimiter,
  webhookRateLimiter,
  serviceRateLimiter,
} from "./rateLimiters";

// Service-to-service authentication
export { verifyServiceToken } from "./serviceAuth";

