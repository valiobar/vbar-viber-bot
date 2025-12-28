/**
 * Rate limiting middleware for Viber service routes
 *
 * This file contains all rate limiter configurations including:
 * - General rate limiter for all routes
 * - Health check rate limiter
 * - Webhook rate limiter
 * - Service-to-service rate limiter
 *
 * Location: Input Adapters layer (Hexagonal Architecture)
 */

import { Request, Response } from "express";
import rateLimit, { RateLimitRequestHandler } from "express-rate-limit";
import { getRateLimitConfig } from "../../../config/security";

/**
 * Get rate limit configuration
 * Uses the centralized security configuration helper
 */
const rateLimitConfig = getRateLimitConfig();

/**
 * General rate limiter for all routes
 * Default: 100 requests per minute per IP
 */
export const generalRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: rateLimitConfig.windowMs,
  max: rateLimitConfig.maxRequests,
  message: {
    error: {
      code: "SVC_003",
      message: "Too many requests, please try again later",
    },
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers (draft standard)
  legacyHeaders: true, // Return rate limit info in `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: {
        code: "SVC_003",
        message: "Too many requests, please try again later",
      },
    });
  },
});

/**
 * Strict rate limiter for health check routes
 * Default: 10 requests per minute per IP
 */
export const healthCheckRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: rateLimitConfig.windowMs,
  max: rateLimitConfig.healthMax,
  message: {
    error: {
      code: "SVC_003",
      message: "Too many health check requests, please try again later",
    },
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers (draft standard)
  legacyHeaders: true, // Return rate limit info in `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: {
        code: "SVC_003",
        message: "Too many health check requests, please try again later",
      },
    });
  },
});

/**
 * Rate limiter for webhook routes
 * Default: 1000 requests per minute per IP
 * Viber can send many events, so this limit is higher
 */
export const webhookRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: rateLimitConfig.windowMs,
  max: rateLimitConfig.webhookMax,
  message: {
    error: {
      code: "SVC_003",
      message: "Too many webhook requests, please try again later",
    },
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers (draft standard)
  legacyHeaders: true, // Return rate limit info in `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: {
        code: "SVC_003",
        message: "Too many webhook requests, please try again later",
      },
    });
  },
});

/**
 * Rate limiter for service-to-service API routes
 * Default: 5000 requests per minute per service token
 * Uses service token for identification instead of IP
 */
export const serviceRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: rateLimitConfig.windowMs,
  max: rateLimitConfig.serviceMax,
  keyGenerator: (req: Request): string => {
    // Use service token for identification if available, otherwise fall back to IP
    const serviceToken = req.headers["x-service-token"] as string;
    if (serviceToken) {
      return `service:${serviceToken}`;
    }
    // Fall back to IP if no service token
    return req.ip || req.socket.remoteAddress || "unknown";
  },
  message: {
    error: {
      code: "SVC_003",
      message: "Too many service requests, please try again later",
    },
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers (draft standard)
  legacyHeaders: true, // Return rate limit info in `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: {
        code: "SVC_003",
        message: "Too many service requests, please try again later",
      },
    });
  },
});

