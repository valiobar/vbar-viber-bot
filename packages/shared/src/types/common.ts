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
  | "config.updated";

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
  | "admin.config"
  | "viber.refresh";

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

/**
 * Refresh event for bot data cache invalidation
 */
export interface RefreshEvent {
  type: "bot_data_refresh";
  timestamp: string;
  source: "admin_service";
  dataType?: "all" | "steps" | "messages" | "keyboards" | "bot_settings";
}
