# API Documentation

## Table of Contents

1. [API Overview](#api-overview)
2. [Admin Service API](#admin-service-api)
3. [Viber Service API](#viber-service-api)
4. [AI Service API](#ai-service-api)
5. [Analytics Service API](#analytics-service-api)
6. [Message Queue API](#message-queue-api)
7. [gRPC API](#grpc-api)
8. [API Contracts](#api-contracts)

## API Overview

### API Architecture

The vbar-viber-bot project uses multiple communication protocols depending on the service interaction:

- **RESTful API**: For Admin Service interactions with other services
- **gRPC**: For high-performance communication between Viber Service and AI Service
- **RabbitMQ**: For asynchronous communication from Viber Service to Analytics Service

All services follow consistent patterns for authentication, error handling, and response formatting.

**Communication Patterns**:

- **REST API**: Used for synchronous communication (Admin ↔ Analytics, Admin ↔ Viber, Admin ↔ AI)
- **gRPC**: Used for Viber Service ↔ AI Service communication (message processing, intent detection)
- **RabbitMQ**: Used only for asynchronous data flow from Viber Service → Analytics Service

### Base URLs

**Development Environment**:

- Admin Service: `http://localhost:3000`
- Viber Service: `http://localhost:3001`
- AI Service: `http://localhost:3002`
- Analytics Service: `http://localhost:3003`

**Production Environment**:

- Base URLs are configured via environment variables and Kubernetes Ingress
- Services are accessible through service names within the Kubernetes cluster
- External access is provided through Ingress controllers

### Authentication and Authorization

#### JWT Token Authentication

Most endpoints require JWT (JSON Web Token) authentication:

```http
Authorization: Bearer <jwt_token>
```

**Token Format**:

```typescript
interface JWTPayload {
  userId: string;
  email: string;
  role: "admin" | "user" | "viewer";
  iat: number;
  exp: number;
}
```

#### Service-to-Service Authentication

Services communicate using API keys or service tokens:

```http
X-Service-Token: <service_token>
X-Service-Name: <service_name>
```

### Error Handling

All APIs follow a consistent error response format:

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
    path: string;
  };
}
```

**HTTP Status Codes**:

- `200 OK` - Successful request
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Authentication required or invalid
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (e.g., duplicate entry)
- `422 Unprocessable Entity` - Validation error
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - Service temporarily unavailable

### Response Formats

#### Success Response

```typescript
interface SuccessResponse<T> {
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    timestamp: string;
  };
}
```

#### Pagination

Paginated responses include metadata:

```typescript
interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

### Rate Limiting

Rate limiting is implemented to prevent abuse:

- **Default Rate Limit**: 100 requests per minute per IP
- **Authenticated Users**: 1000 requests per minute per user
- **Service-to-Service**: 5000 requests per minute per service

Rate limit headers are included in responses:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Admin Service API

**Base URL**: `http://localhost:3000` (development)

The Admin Service provides endpoints for administrative operations, user management, and system configuration. The Admin Service retrieves analytics data from the Analytics Service via REST API calls (see Analytics Service API section).

### Authentication Endpoints

#### POST /api/auth/login

Authenticate user and receive JWT token.

**Request**:

```typescript
interface LoginRequest {
  email: string;
  password: string;
}
```

**Response** (`200 OK`):

```typescript
interface LoginResponse {
  data: {
    token: string;
    user: {
      id: string;
      email: string;
      name: string;
      role: "admin" | "user" | "viewer";
    };
    expiresIn: number; // seconds
  };
}
```

**Error Codes**:

- `AUTH_001` - Invalid credentials
- `AUTH_002` - Account locked
- `AUTH_003` - Account disabled

#### POST /api/auth/logout

Invalidate current session.

**Headers**: `Authorization: Bearer <token>`

**Response** (`200 OK`):

```typescript
{
  data: {
    message: "Logged out successfully";
  }
}
```

#### POST /api/auth/refresh

Refresh JWT token.

**Headers**: `Authorization: Bearer <token>`

**Response** (`200 OK`):

```typescript
{
  data: {
    token: string;
    expiresIn: number;
  }
}
```

### User Management Endpoints

#### GET /api/users

Get list of users with pagination.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:

- `page` (number, default: 1) - Page number
- `limit` (number, default: 20) - Items per page
- `role` (string, optional) - Filter by role
- `search` (string, optional) - Search by email or name

**Response** (`200 OK`):

```typescript
{
  data: User[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

#### GET /api/users/:id

Get user by ID.

**Headers**: `Authorization: Bearer <token>`

**Response** (`200 OK`):

```typescript
{
  data: {
    id: string;
    email: string;
    name: string;
    role: "admin" | "user" | "viewer";
    createdAt: string;
    updatedAt: string;
  }
}
```

#### POST /api/users

Create new user.

**Headers**: `Authorization: Bearer <token>` (requires admin role)

**Request**:

```typescript
interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  role: "admin" | "user" | "viewer";
}
```

**Response** (`201 Created`):

```typescript
{
  data: User;
}
```

**Error Codes**:

- `USER_001` - Email already exists
- `USER_002` - Invalid email format
- `USER_003` - Password too weak

#### PUT /api/users/:id

Update user.

**Headers**: `Authorization: Bearer <token>`

**Request**:

```typescript
interface UpdateUserRequest {
  name?: string;
  role?: "admin" | "user" | "viewer";
  password?: string;
}
```

**Response** (`200 OK`):

```typescript
{
  data: User;
}
```

#### DELETE /api/users/:id

Delete user.

**Headers**: `Authorization: Bearer <token>` (requires admin role)

**Response** (`200 OK`):

```typescript
{
  data: {
    message: "User deleted successfully";
  }
}
```

### Configuration Endpoints

#### GET /api/config

Get system configuration.

**Headers**: `Authorization: Bearer <token>`

**Response** (`200 OK`):

```typescript
{
  data: {
    bot: {
      enabled: boolean;
      welcomeMessage: string;
      defaultLanguage: string;
    }
    ai: {
      model: string;
      temperature: number;
      maxTokens: number;
    }
    analytics: {
      retentionDays: number;
      aggregationInterval: string;
    }
  }
}
```

#### PUT /api/config

Update system configuration.

**Headers**: `Authorization: Bearer <token>` (requires admin role)

**Request**:

```typescript
interface UpdateConfigRequest {
  bot?: {
    enabled?: boolean;
    welcomeMessage?: string;
    defaultLanguage?: string;
  };
  ai?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
  analytics?: {
    retentionDays?: number;
    aggregationInterval?: string;
  };
}
```

**Response** (`200 OK`):

```typescript
{
  data: Config;
}
```

### Health Check

#### GET /api/health

Service health check.

**Response** (`200 OK`):

```typescript
{
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  services: {
    database: "connected" | "disconnected";
    messageQueue: "connected" | "disconnected";
  }
}
```

## Viber Service API

**Base URL**: `http://localhost:3001` (development)

The Viber Service handles Viber bot webhooks, message processing, and bot configuration. The Viber Service communicates with the AI Service using **gRPC** for high-performance message processing and intent detection.

### Webhook Endpoints

#### POST /webhook/viber

Viber webhook endpoint for receiving events from Viber.

**Request** (Viber Webhook Format):

```typescript
interface ViberWebhookEvent {
  event:
    | "message"
    | "delivered"
    | "seen"
    | "conversation_started"
    | "subscribed"
    | "unsubscribed";
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
```

**Response** (`200 OK`):

```typescript
{
  status: "ok";
}
```

**Note**: This endpoint is called by Viber's servers and requires proper webhook verification.

#### GET /webhook/viber

Webhook verification endpoint (Viber requirement).

**Query Parameters**:

- `event` - Event type
- `timestamp` - Timestamp
- `message_token` - Message token
- `user_id` - User ID

**Response** (`200 OK`):

```typescript
{
  status: "ok";
}
```

### Message Handling Endpoints

#### POST /api/messages/send

Send message to Viber user.

**Headers**: `Authorization: Bearer <token>` or `X-Service-Token: <service_token>`

**Request**:

```typescript
interface SendMessageRequest {
  userId: string;
  message: {
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
    keyboard?: {
      Type: "keyboard";
      DefaultHeight: boolean;
      Buttons: Array<{
        ActionType: string;
        ActionBody: string;
        Text: string;
      }>;
    };
  };
}
```

**Response** (`200 OK`):

```typescript
{
  data: {
    messageToken: number;
    status: "sent" | "failed";
    timestamp: string;
  }
}
```

**Error Codes**:

- `MSG_001` - Invalid user ID
- `MSG_002` - Message format invalid
- `MSG_003` - Viber API error

#### GET /api/messages

Get message history.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:

- `userId` (string, optional) - Filter by user ID
- `page` (number, default: 1) - Page number
- `limit` (number, default: 50) - Items per page
- `startDate` (string, ISO 8601, optional) - Start date filter
- `endDate` (string, ISO 8601, optional) - End date filter

**Response** (`200 OK`):

```typescript
{
  data: Message[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}
```

#### GET /api/messages/:id

Get message by ID.

**Headers**: `Authorization: Bearer <token>`

**Response** (`200 OK`):

```typescript
{
  data: {
    id: string;
    userId: string;
    type: string;
    content: Record<string, any>;
    direction: "incoming" | "outgoing";
    status: "sent" | "delivered" | "seen" | "failed";
    timestamp: string;
  }
}
```

### Bot Configuration Endpoints

#### GET /api/bot/config

Get bot configuration.

**Headers**: `Authorization: Bearer <token>` or `X-Service-Token: <service_token>`

**Response** (`200 OK`):

```typescript
{
  data: {
    enabled: boolean;
    welcomeMessage: string;
    defaultLanguage: string;
    autoReply: boolean;
    aiEnabled: boolean;
  }
}
```

#### PUT /api/bot/config

Update bot configuration.

**Headers**: `Authorization: Bearer <token>` or `X-Service-Token: <service_token>`

**Request**:

```typescript
interface UpdateBotConfigRequest {
  enabled?: boolean;
  welcomeMessage?: string;
  defaultLanguage?: string;
  autoReply?: boolean;
  aiEnabled?: boolean;
}
```

**Response** (`200 OK`):

```typescript
{
  data: BotConfig;
}
```

### Health Check

#### GET /api/health

Service health check.

**Response** (`200 OK`):

```typescript
{
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  services: {
    database: "connected" | "disconnected";
    messageQueue: "connected" | "disconnected";
    viberApi: "connected" | "disconnected";
  }
}
```

## AI Service API

**Base URL**: `http://localhost:3002` (development)  
**gRPC Endpoint**: `localhost:50051` (development)  
**Ollama URL**: `http://localhost:11434` (when using self-hosted models)

The AI Service provides endpoints for AI processing, model configuration, and training operations. The Viber Service communicates with the AI Service using **gRPC** for high-performance message processing. The Admin Service accesses AI Service configuration and training endpoints via **REST API**.

**AI Model Providers**:

The AI Service supports multiple AI model providers:

- **Ollama** (Self-hosted): Local LLM models (Llama 2, Mistral, CodeLlama, etc.) - accessed via HTTP API
- **OpenAI**: GPT-4, GPT-3.5, and other OpenAI models - accessed via REST API
- **Anthropic**: Claude models - accessed via REST API
- **Google**: Gemini models - accessed via REST API
- **Other providers**: Extensible architecture supports additional providers

The provider is configured via the `AI_MODEL_PROVIDER` environment variable. The service can dynamically switch between providers and supports fallback mechanisms for reliability.

### AI Processing Endpoints

**Note**: The Viber Service uses **gRPC** to call AI processing methods (see [gRPC API](#grpc-api) section). The REST endpoints below are primarily for Admin Service access and testing purposes.

#### POST /api/ai/process

Process message with AI (REST endpoint - primarily for Admin Service and testing).

**Headers**: `Authorization: Bearer <token>` or `X-Service-Token: <service_token>`

**Note**: For production use, Viber Service should use the gRPC `ProcessMessage` method.

**Request**:

```typescript
interface ProcessMessageRequest {
  message: string;
  userId: string;
  conversationId?: string;
  context?: {
    previousMessages?: Array<{
      role: "user" | "assistant";
      content: string;
    }>;
    userPreferences?: Record<string, any>;
  };
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
}
```

**Response** (`200 OK`):

```typescript
{
  data: {
    response: string;
    intent?: {
      name: string;
      confidence: number;
    };
    entities?: Array<{
      type: string;
      value: string;
      confidence: number;
    }>;
    processingTime: number; // milliseconds
    model: string;
  };
}
```

**Error Codes**:

- `AI_001` - AI service unavailable
- `AI_002` - Invalid message format
- `AI_003` - Model not found
- `AI_004` - Rate limit exceeded

#### POST /api/ai/batch-process

Process multiple messages in batch.

**Headers**: `Authorization: Bearer <token>` or `X-Service-Token: <service_token>`

**Request**:

```typescript
interface BatchProcessRequest {
  messages: Array<{
    message: string;
    userId: string;
    conversationId?: string;
  }>;
  options?: {
    model?: string;
    temperature?: number;
  };
}
```

**Response** (`200 OK`):

```typescript
{
  data: Array<{
    response: string;
    intent?: {
      name: string;
      confidence: number;
    };
    processingTime: number;
  }>;
}
```

#### POST /api/ai/detect-intent

Detect intent from message (REST endpoint - primarily for Admin Service and testing).

**Headers**: `Authorization: Bearer <token>` or `X-Service-Token: <service_token>`

**Note**: For production use, Viber Service should use the gRPC `DetectIntent` method.

**Request**:

```typescript
interface DetectIntentRequest {
  message: string;
  userId?: string;
}
```

**Response** (`200 OK`):

```typescript
{
  data: {
    intent: {
      name: string;
      confidence: number;
      description?: string;
    };
    entities: Array<{
      type: string;
      value: string;
      confidence: number;
    }>;
  };
}
```

### Model Configuration Endpoints

#### GET /api/ai/models

Get available AI models.

**Headers**: `Authorization: Bearer <token>`

**Response** (`200 OK`):

```typescript
{
  data: Array<{
    id: string;
    name: string;
    provider: string;
    description: string;
    capabilities: string[];
    status: "active" | "inactive" | "deprecated";
  }>;
}
```

#### GET /api/ai/models/:id

Get model details.

**Headers**: `Authorization: Bearer <token>`

**Response** (`200 OK`):

```typescript
{
  data: {
    id: string;
    name: string;
    provider: string;
    description: string;
    configuration: {
      temperature: number;
      maxTokens: number;
      topP: number;
      frequencyPenalty: number;
      presencePenalty: number;
    }
    status: "active" | "inactive" | "deprecated";
  }
}
```

#### PUT /api/ai/models/:id/config

Update model configuration.

**Headers**: `Authorization: Bearer <token>` (requires admin role)

**Request**:

```typescript
interface UpdateModelConfigRequest {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}
```

**Response** (`200 OK`):

```typescript
{
  data: ModelConfig;
}
```

### Training Endpoints

#### POST /api/ai/train

Trigger model training (if applicable).

**Headers**: `Authorization: Bearer <token>` (requires admin role)

**Request**:

```typescript
interface TrainModelRequest {
  modelId: string;
  trainingData?: Array<{
    input: string;
    output: string;
  }>;
  parameters?: Record<string, any>;
}
```

**Response** (`202 Accepted`):

```typescript
{
  data: {
    trainingId: string;
    status: 'queued' | 'running';
    estimatedCompletion?: string;
  };
}
```

#### GET /api/ai/train/:trainingId

Get training status.

**Headers**: `Authorization: Bearer <token>`

**Response** (`200 OK`):

```typescript
{
  data: {
    trainingId: string;
    status: 'queued' | 'running' | 'completed' | 'failed';
    progress?: number; // 0-100
    startedAt?: string;
    completedAt?: string;
    error?: string;
  };
}
```

### Health Check

#### GET /api/health

Service health check.

**Response** (`200 OK`):

```typescript
{
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  services: {
    database: "connected" | "disconnected";
    messageQueue: "connected" | "disconnected";
    aiProvider: "connected" | "disconnected";
  }
}
```

## Analytics Service API

**Base URL**: `http://localhost:3003` (development)

The Analytics Service provides endpoints for querying analytics data, generating reports, and exporting data. The Admin Service accesses all analytics data through these REST API endpoints. The Analytics Service receives data asynchronously from the Viber Service via RabbitMQ message queue.

### Analytics Query Endpoints

#### GET /api/analytics/events

Get analytics events with filtering.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:

- `type` (string, optional) - Event type filter
- `userId` (string, optional) - Filter by user ID
- `startDate` (string, ISO 8601, required) - Start date
- `endDate` (string, ISO 8601, required) - End date
- `page` (number, default: 1) - Page number
- `limit` (number, default: 100) - Items per page

**Response** (`200 OK`):

```typescript
{
  data: Array<{
    id: string;
    type: string;
    userId?: string;
    properties: Record<string, any>;
    timestamp: string;
  }>;
  meta: {
    page: number;
    limit: number;
    total: number;
  }
}
```

#### GET /api/analytics/metrics

Get aggregated metrics.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:

- `metric` (string, required) - Metric name (e.g., 'messages_sent', 'users_active')
- `startDate` (string, ISO 8601, required) - Start date
- `endDate` (string, ISO 8601, required) - End date
- `interval` (string, optional) - Aggregation interval ('hour', 'day', 'week', 'month')
- `groupBy` (string, optional) - Group by field (e.g., 'userId', 'type')

**Response** (`200 OK`):

```typescript
{
  data: {
    metric: string;
    interval: string;
    values: Array<{
      timestamp: string;
      value: number;
      group?: string;
    }>;
    summary: {
      total: number;
      average: number;
      min: number;
      max: number;
    }
  }
}
```

#### GET /api/analytics/dashboard

Get dashboard data (aggregated metrics for dashboard view).

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:

- `period` (string, optional) - Time period ('today', 'week', 'month', 'year')
- `metrics` (string[], optional) - Specific metrics to include

**Response** (`200 OK`):

```typescript
{
  data: {
    period: string;
    metrics: Array<{
      name: string;
      value: number;
      change?: number; // percentage change from previous period
      trend: "up" | "down" | "stable";
    }>;
    charts: Array<{
      name: string;
      type: "line" | "bar" | "pie";
      data: Array<{
        label: string;
        value: number;
      }>;
    }>;
  }
}
```

### Reporting Endpoints

#### POST /api/analytics/reports

Generate a new report.

**Headers**: `Authorization: Bearer <token>`

**Request**:

```typescript
interface GenerateReportRequest {
  name: string;
  type: "daily" | "weekly" | "monthly" | "custom";
  parameters: {
    startDate: string;
    endDate: string;
    metrics: string[];
    filters?: Record<string, any>;
  };
}
```

**Response** (`202 Accepted`):

```typescript
{
  data: {
    reportId: string;
    status: 'generating' | 'completed' | 'failed';
    estimatedCompletion?: string;
  };
}
```

#### GET /api/analytics/reports

Get list of reports.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:

- `type` (string, optional) - Filter by report type
- `page` (number, default: 1) - Page number
- `limit` (number, default: 20) - Items per page

**Response** (`200 OK`):

```typescript
{
  data: Array<{
    id: string;
    name: string;
    type: string;
    status: "generating" | "completed" | "failed";
    generatedAt: string;
    generatedBy?: string;
  }>;
  meta: {
    page: number;
    limit: number;
    total: number;
  }
}
```

#### GET /api/analytics/reports/:id

Get report details and data.

**Headers**: `Authorization: Bearer <token>`

**Response** (`200 OK`):

```typescript
{
  data: {
    id: string;
    name: string;
    type: string;
    parameters: Record<string, any>;
    data: Record<string, any>;
    generatedAt: string;
    generatedBy?: string;
  };
}
```

#### DELETE /api/analytics/reports/:id

Delete a report.

**Headers**: `Authorization: Bearer <token>`

**Response** (`200 OK`):

```typescript
{
  data: {
    message: "Report deleted successfully";
  }
}
```

### Data Export Endpoints

#### POST /api/analytics/export

Export analytics data.

**Headers**: `Authorization: Bearer <token>`

**Request**:

```typescript
interface ExportDataRequest {
  format: "csv" | "json" | "xlsx";
  startDate: string;
  endDate: string;
  metrics: string[];
  filters?: Record<string, any>;
}
```

**Response** (`202 Accepted`):

```typescript
{
  data: {
    exportId: string;
    status: 'processing' | 'completed' | 'failed';
    downloadUrl?: string;
    expiresAt?: string;
  };
}
```

#### GET /api/analytics/export/:exportId

Get export status and download URL.

**Headers**: `Authorization: Bearer <token>`

**Response** (`200 OK`):

```typescript
{
  data: {
    exportId: string;
    status: 'processing' | 'completed' | 'failed';
    format: string;
    downloadUrl?: string;
    expiresAt?: string;
    fileSize?: number;
  };
}
```

#### GET /api/analytics/export/:exportId/download

Download exported file.

**Headers**: `Authorization: Bearer <token>`

**Response**: File download (content-type depends on format)

### Health Check

#### GET /api/health

Service health check.

**Response** (`200 OK`):

```typescript
{
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  services: {
    database: "connected" | "disconnected";
    messageQueue: "connected" | "disconnected";
  }
}
```

## Message Queue API

The system uses **RabbitMQ** exclusively for asynchronous communication from the Viber Service to the Analytics Service. This allows the Viber Service to send analytics events without blocking, and the Analytics Service to process them asynchronously.

**Note**: All other service-to-service communication uses REST APIs. The Admin Service retrieves analytics data from the Analytics Service via REST API endpoints.

### Queue Configuration

**RabbitMQ Connection**:

- Host: Configured via `RABBITMQ_HOST` environment variable
- Port: `5672` (default)
- Management UI: `http://localhost:15672` (development)

### Queue Names and Routing Keys

#### analytics.events

**Purpose**: Analytics events sent from Viber Service to Analytics Service

**Queue Name**: `analytics.events`

**Publisher**: Viber Service  
**Consumer**: Analytics Service

**Routing Keys**:

- `analytics.event` - General analytics event
- `analytics.message.received` - Message received event
- `analytics.message.sent` - Message sent event
- `analytics.user.action` - User action event
- `analytics.bot.interaction` - Bot interaction event

**Message Format**:

```typescript
interface AnalyticsEvent {
  event:
    | "analytics.event"
    | "analytics.message.received"
    | "analytics.message.sent"
    | "analytics.user.action"
    | "analytics.bot.interaction";
  timestamp: string;
  type: string;
  userId?: string;
  messageId?: string;
  properties: Record<string, any>;
  metadata?: {
    source: "viber";
    sessionId?: string;
    conversationId?: string;
  };
}
```

**Example Message**:

```typescript
{
  event: "analytics.message.received",
  timestamp: "2024-01-15T10:30:00.000Z",
  type: "message",
  userId: "user123",
  messageId: "msg456",
  properties: {
    messageType: "text",
    messageLength: 25,
    language: "en"
  },
  metadata: {
    source: "viber",
    sessionId: "session789",
    conversationId: "conv123"
  }
}
```

### Publishing Patterns

#### Publishing from Viber Service

The Viber Service publishes analytics events to RabbitMQ when events occur:

```typescript
// Example: Publishing an analytics event from Viber Service
await messageQueue.publish("analytics.events", "analytics.message.received", {
  event: "analytics.message.received",
  timestamp: new Date().toISOString(),
  type: "message",
  userId: "user123",
  messageId: "msg456",
  properties: {
    messageType: "text",
    messageLength: 25,
    language: "en",
  },
  metadata: {
    source: "viber",
    sessionId: "session789",
    conversationId: "conv123",
  },
});
```

#### Publishing with Exchange

```typescript
// Using topic exchange for routing
await channel.publish(
  "analytics",
  "analytics.message.received",
  Buffer.from(JSON.stringify(event))
);
```

### Consuming Patterns

#### Consuming in Analytics Service

The Analytics Service consumes messages from the queue and processes them:

```typescript
// Example: Consuming analytics events in Analytics Service
await messageQueue.consume("analytics.events", async (message) => {
  const event = JSON.parse(message.content.toString());

  // Process the analytics event
  await processAnalyticsEvent(event);

  // Acknowledge the message
  channel.ack(message);
});
```

#### Error Handling

```typescript
// Handle processing errors
try {
  await processAnalyticsEvent(message);
  channel.ack(message);
} catch (error) {
  // Log error and reject (don't requeue to avoid infinite loops)
  console.error("Failed to process analytics event:", error);
  channel.nack(message, false, false);

  // Optionally send to dead letter queue for later analysis
  await channel.publish("analytics.errors", "analytics.event.failed", message);
}
```

### Communication Flow

```
Viber Service → RabbitMQ (analytics.events queue) → Analytics Service
                                                          ↓
                                              Store in MongoDB
                                                          ↓
Admin Service ← REST API (GET /api/analytics/...) ← Analytics Service
```

### Event Types Summary

| Event Type                   | Queue              | Routing Key                  | Publisher     | Consumer          |
| ---------------------------- | ------------------ | ---------------------------- | ------------- | ----------------- |
| `analytics.event`            | `analytics.events` | `analytics.event`            | Viber Service | Analytics Service |
| `analytics.message.received` | `analytics.events` | `analytics.message.received` | Viber Service | Analytics Service |
| `analytics.message.sent`     | `analytics.events` | `analytics.message.sent`     | Viber Service | Analytics Service |
| `analytics.user.action`      | `analytics.events` | `analytics.user.action`      | Viber Service | Analytics Service |
| `analytics.bot.interaction`  | `analytics.events` | `analytics.bot.interaction`  | Viber Service | Analytics Service |

## gRPC API

The Viber Service and AI Service communicate using **gRPC** for high-performance, low-latency message processing. gRPC provides efficient binary serialization and HTTP/2 multiplexing, making it ideal for real-time AI processing requests.

### gRPC Configuration

**AI Service gRPC Endpoint**:

- **Development**: `localhost:50051`
- **Production**: Configured via environment variables

**Protocol**: Protocol Buffers (protobuf) over HTTP/2

### gRPC Service Definition

#### AI Processing Service

**Service Name**: `ai.AIProcessingService`

**Methods**:

##### ProcessMessage

Process a single message with AI.

**Request** (`ProcessMessageRequest`):

```protobuf
message ProcessMessageRequest {
  string message = 1;
  string userId = 2;
  string conversationId = 3;
  MessageContext context = 4;
  ProcessingOptions options = 5;
}

message MessageContext {
  repeated Message previousMessages = 1;
  map<string, string> userPreferences = 2;
}

message Message {
  string role = 1; // "user" or "assistant"
  string content = 2;
}

message ProcessingOptions {
  string model = 1;
  double temperature = 2;
  int32 maxTokens = 3;
}
```

**Response** (`ProcessMessageResponse`):

```protobuf
message ProcessMessageResponse {
  string response = 1;
  Intent intent = 2;
  repeated Entity entities = 3;
  int64 processingTimeMs = 4;
  string model = 5;
}

message Intent {
  string name = 1;
  double confidence = 2;
}

message Entity {
  string type = 1;
  string value = 2;
  double confidence = 3;
}
```

**TypeScript Interface**:

```typescript
interface ProcessMessageRequest {
  message: string;
  userId: string;
  conversationId?: string;
  context?: {
    previousMessages?: Array<{
      role: "user" | "assistant";
      content: string;
    }>;
    userPreferences?: Record<string, string>;
  };
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

interface ProcessMessageResponse {
  response: string;
  intent?: {
    name: string;
    confidence: number;
  };
  entities?: Array<{
    type: string;
    value: string;
    confidence: number;
  }>;
  processingTimeMs: number;
  model: string;
}
```

##### DetectIntent

Detect intent from a message without full processing.

**Request** (`DetectIntentRequest`):

```protobuf
message DetectIntentRequest {
  string message = 1;
  string userId = 2;
}
```

**Response** (`DetectIntentResponse`):

```protobuf
message DetectIntentResponse {
  Intent intent = 1;
  repeated Entity entities = 2;
}
```

**TypeScript Interface**:

```typescript
interface DetectIntentRequest {
  message: string;
  userId?: string;
}

interface DetectIntentResponse {
  intent: {
    name: string;
    confidence: number;
  };
  entities: Array<{
    type: string;
    value: string;
    confidence: number;
  }>;
}
```

##### BatchProcessMessages

Process multiple messages in a single batch request.

**Request** (`BatchProcessRequest`):

```protobuf
message BatchProcessRequest {
  repeated BatchMessage messages = 1;
  ProcessingOptions options = 2;
}

message BatchMessage {
  string message = 1;
  string userId = 2;
  string conversationId = 3;
}
```

**Response** (`BatchProcessResponse`):

```protobuf
message BatchProcessResponse {
  repeated ProcessMessageResponse results = 1;
}
```

**TypeScript Interface**:

```typescript
interface BatchProcessRequest {
  messages: Array<{
    message: string;
    userId: string;
    conversationId?: string;
  }>;
  options?: {
    model?: string;
    temperature?: number;
  };
}

interface BatchProcessResponse {
  results: Array<ProcessMessageResponse>;
}
```

### gRPC Error Handling

gRPC uses standard status codes:

- `OK` (0) - Success
- `INVALID_ARGUMENT` (3) - Invalid request parameters
- `NOT_FOUND` (5) - Resource not found
- `UNAVAILABLE` (14) - Service unavailable
- `INTERNAL` (13) - Internal server error
- `DEADLINE_EXCEEDED` (4) - Request timeout

**Error Response Format**:

```typescript
interface GRPCError {
  code: number;
  message: string;
  details?: any[];
}
```

### gRPC Client Usage (Viber Service)

**Example: Calling AI Service from Viber Service**

```typescript
import { AIProcessingServiceClient } from "./generated/ai_grpc_pb";
import {
  ProcessMessageRequest,
  ProcessMessageResponse,
} from "./generated/ai_pb";

// Create gRPC client
const client = new AIProcessingServiceClient(
  "localhost:50051",
  credentials.createInsecure()
);

// Process message
async function processMessage(message: string, userId: string) {
  const request = new ProcessMessageRequest();
  request.setMessage(message);
  request.setUserId(userId);

  try {
    const response: ProcessMessageResponse = await new Promise(
      (resolve, reject) => {
        client.processMessage(request, (error, response) => {
          if (error) reject(error);
          else resolve(response);
        });
      }
    );

    return {
      response: response.getResponse(),
      intent: response.getIntent()
        ? {
            name: response.getIntent()!.getName(),
            confidence: response.getIntent()!.getConfidence(),
          }
        : undefined,
      entities: response.getEntitiesList().map((e) => ({
        type: e.getType(),
        value: e.getValue(),
        confidence: e.getConfidence(),
      })),
    };
  } catch (error) {
    console.error("gRPC error:", error);
    throw error;
  }
}
```

### Communication Flow

```
Viber Service → gRPC Call → AI Service
     ↓                              ↓
  Request                    Process Message
     ↓                              ↓
  Response ← gRPC Response ← Return Result
```

### gRPC vs REST for Viber-AI Communication

**Why gRPC for Viber ↔ AI**:

- **Performance**: Binary serialization is faster than JSON
- **Low Latency**: HTTP/2 multiplexing reduces connection overhead
- **Type Safety**: Protocol Buffers provide strong typing
- **Streaming**: Supports bidirectional streaming for real-time processing
- **Efficiency**: Better for high-frequency, low-latency requests

**REST API is still used for**:

- Admin Service → AI Service (configuration, training)
- External integrations
- Webhook endpoints

## API Contracts

### TypeScript Interfaces

#### Common Types

```typescript
// Base entity interface
interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// User interface
interface User extends BaseEntity {
  email: string;
  name: string;
  role: "admin" | "user" | "viewer";
  lastLoginAt?: string;
}

// Message interface
interface Message extends BaseEntity {
  userId: string;
  conversationId?: string;
  type: string;
  content: Record<string, any>;
  direction: "incoming" | "outgoing";
  status: "sent" | "delivered" | "seen" | "failed";
  timestamp: string;
}

// Configuration interface
interface Config {
  bot: {
    enabled: boolean;
    welcomeMessage: string;
    defaultLanguage: string;
    autoReply: boolean;
    aiEnabled: boolean;
  };
  ai: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
  analytics: {
    retentionDays: number;
    aggregationInterval: "hour" | "day" | "week" | "month";
  };
}
```

### Request Validation Rules

#### Email Validation

- Must be a valid email format
- Maximum length: 255 characters
- Regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`

#### Password Validation

- Minimum length: 8 characters
- Must contain at least one uppercase letter
- Must contain at least one lowercase letter
- Must contain at least one number
- Must contain at least one special character

#### Date Validation

- Must be in ISO 8601 format: `YYYY-MM-DDTHH:mm:ss.sssZ`
- Example: `2024-01-15T10:30:00.000Z`

#### Pagination Validation

- `page`: Must be a positive integer, minimum: 1
- `limit`: Must be a positive integer, minimum: 1, maximum: 100

#### UUID Validation

- Must be a valid UUID v4 format
- Regex: `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`

### Response Schema Examples

#### Success Response Schema

```json
{
  "data": {
    // Response data object
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Error Response Schema

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional error details"
    },
    "timestamp": "2024-01-15T10:30:00.000Z",
    "path": "/api/endpoint"
  }
}
```

#### Paginated Response Schema

```json
{
  "data": [
    // Array of items
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Error Code Reference

#### Authentication Errors

- `AUTH_001` - Invalid credentials
- `AUTH_002` - Account locked
- `AUTH_003` - Account disabled
- `AUTH_004` - Token expired
- `AUTH_005` - Token invalid
- `AUTH_006` - Insufficient permissions

#### User Errors

- `USER_001` - Email already exists
- `USER_002` - Invalid email format
- `USER_003` - Password too weak
- `USER_004` - User not found
- `USER_005` - User already exists

#### Message Errors

- `MSG_001` - Invalid user ID
- `MSG_002` - Message format invalid
- `MSG_003` - Viber API error
- `MSG_004` - Message not found
- `MSG_005` - Message sending failed

#### AI Errors

- `AI_001` - AI service unavailable
- `AI_002` - Invalid message format
- `AI_003` - Model not found
- `AI_004` - Rate limit exceeded
- `AI_005` - Processing timeout
- `AI_006` - Training failed

#### Analytics Errors

- `ANALYTICS_001` - Invalid date range
- `ANALYTICS_002` - Metric not found
- `ANALYTICS_003` - Report generation failed
- `ANALYTICS_004` - Export failed
- `ANALYTICS_005` - Invalid query parameters

#### General Errors

- `GEN_001` - Validation error
- `GEN_002` - Internal server error
- `GEN_003` - Service unavailable
- `GEN_004` - Rate limit exceeded
- `GEN_005` - Request timeout

### API Versioning

Currently, the API does not use versioning in the URL path. Future versions may implement versioning:

- URL-based: `/api/v1/...`, `/api/v2/...`
- Header-based: `Accept: application/vnd.api+json;version=1`
- Query parameter: `?version=1`

### Rate Limiting Details

#### Rate Limit Tiers

1. **Anonymous/Public**: 100 requests/minute
2. **Authenticated Users**: 1000 requests/minute
3. **Service-to-Service**: 5000 requests/minute
4. **Admin Users**: 10000 requests/minute

#### Rate Limit Headers

All responses include rate limit information:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
X-RateLimit-Reset: 1640995200
Retry-After: 60
```

#### Rate Limit Exceeded Response

When rate limit is exceeded, the API returns:

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json

{
  "error": {
    "code": "GEN_004",
    "message": "Rate limit exceeded",
    "details": {
      "limit": 1000,
      "resetAt": "2024-01-15T10:31:00.000Z"
    },
    "timestamp": "2024-01-15T10:30:00.000Z",
    "path": "/api/endpoint"
  }
}
```

### Content Types

- **Request Content-Type**: `application/json`
- **Response Content-Type**: `application/json`
- **File Uploads**: `multipart/form-data`
- **File Downloads**: Varies by file type (e.g., `application/csv`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`)

### CORS Configuration

CORS is configured for cross-origin requests:

- **Allowed Origins**: Configured via environment variables
- **Allowed Methods**: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `OPTIONS`
- **Allowed Headers**: `Content-Type`, `Authorization`, `X-Service-Token`, `X-Service-Name`
- **Credentials**: Supported for authenticated requests

---

## Additional Resources

- [Architecture Documentation](./architecture.md) - System architecture details
- [Setup Guide](./setup.md) - Development setup instructions
- [Deployment Guide](./deployment.md) - Deployment procedures

For questions or issues, please refer to the project documentation or contact the development team.
