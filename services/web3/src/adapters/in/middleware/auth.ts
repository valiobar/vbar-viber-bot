/**
 * Service-to-service authentication middleware
 *
 * This middleware validates service tokens for internal service communication.
 *
 * Location: Input Adapters layer (Hexagonal Architecture)
 */

import { Request, Response, NextFunction } from "express";
import {
  getServiceTokens,
  validateServiceToken,
} from "../../../config/security";

/**
 * Middleware to verify service-to-service authentication
 *
 * This middleware validates the X-Service-Token header against configured
 * service tokens from environment variables. It supports optional X-Service-Name
 * header for service identification and logging.
 *
 * This middleware:
 * - Extracts the service token from the X-Service-Token header
 * - Optionally extracts service name from X-Service-Name header (for logging)
 * - Validates token using the centralized security configuration helper
 * - Returns 401 Unauthorized if token is invalid or missing
 *
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export function verifyServiceToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // Get service token from header (case-insensitive)
    const serviceToken = req.headers["x-service-token"] as string;

    if (!serviceToken) {
      res.status(401).json({
        error: {
          code: "WEB3_001",
          message: "Missing service token",
        },
      });
      return;
    }

    // Get optional service name for logging
    const serviceName = req.headers["x-service-name"] as string | undefined;

    // Check if any service tokens are configured
    const validTokens = getServiceTokens();
    if (validTokens.length === 0) {
      console.error(
        "No service tokens configured. Service-to-service authentication is disabled."
      );
      res.status(500).json({
        error: {
          code: "WEB3_002",
          message: "Server configuration error: Service tokens not configured",
        },
      });
      return;
    }

    // Validate token using the centralized security configuration helper
    const isValid = validateServiceToken(serviceToken);

    if (!isValid) {
      // Log failed authentication attempt (without exposing token)
      const logMessage = serviceName
        ? `Service authentication failed for service: ${serviceName}`
        : "Service authentication failed: Invalid service token";
      console.warn(logMessage);

      res.status(401).json({
        error: {
          code: "WEB3_001",
          message: "Invalid service token",
        },
      });
      return;
    }

    // Token is valid, proceed to next middleware
    // Optionally log successful authentication with service name
    if (serviceName) {
      console.log(`Service authenticated: ${serviceName}`);
    }

    next();
  } catch (error) {
    console.error("Error verifying service token:", error);
    res.status(500).json({
      error: {
        code: "WEB3_002",
        message: "Internal server error",
      },
    });
  }
}
