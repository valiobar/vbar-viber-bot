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
  | "viber.refresh"
  | "analytics.step-usage";

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
  dataType?:
    | "all"
    | "steps"
    | "messages"
    | "keyboards"
    | "carousels"
    | "bot_settings"
    | "broadcasts";
}

/**
 * How a step execution was initiated
 */
export type StepUsageSource = "trigger" | "welcome" | "subscribe";

/**
 * Step usage analytics event (viber → admin via RabbitMQ)
 */
export interface StepUsageEvent {
  type: "step_usage";
  /** Step ID from admin_service.steps */
  stepId: string;
  /** Viber user ID */
  userId: string;
  /** How the step was initiated */
  source: StepUsageSource;
  /** Matched trigger text (only when source === "trigger") */
  trigger?: string;
  /** Custom handler name when the step ran a custom handler */
  customHandler?: string | null;
  timestamp: string;
}
