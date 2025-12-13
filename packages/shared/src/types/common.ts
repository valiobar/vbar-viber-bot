/**
 * Common TypeScript types shared across all microservices
 */

/**
 * Base entity interface with common fields
 */
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T = any> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}

/**
 * Message Queue Event Types
 */
export type MessageQueueEventType =
  | "message.received"
  | "message.processed"
  | "user.created"
  | "config.updated"
  | "analytics.event";

/**
 * Message Queue Event
 */
export interface MessageQueueEvent<T = any> {
  type: MessageQueueEventType;
  payload: T;
  timestamp: string;
  source: string;
  correlationId?: string;
}

/**
 * Message Queue Queue Names
 */
export type MessageQueueName =
  | "viber.messages"
  | "ai.processed"
  | "analytics.events"
  | "admin.config";

/**
 * Health Check Response
 */
export interface HealthCheckResponse {
  status: "ok" | "error";
  timestamp: string;
  service: string;
  version?: string;
  uptime?: number;
  dependencies?: {
    database?: "connected" | "disconnected";
    messageQueue?: "connected" | "disconnected";
    [key: string]: "connected" | "disconnected" | undefined;
  };
}
